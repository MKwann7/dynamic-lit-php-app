import { FloatShield } from './float-shield';
import {
    DynamicManifestClient,
    WidgetManifest,
    WidgetDependency,
} from './dynamic-manifest-client';
import type {
    WidgetRuntime,
    AppIdentity,
    MountRecord,
    LoadComponentOptions,
    TransitionType,
    MountRoutingContext,
    BreadcrumbItem,
} from '@maxr/shared/types';
import { defineDynSlotElement, defineDynMountElement } from './dyn-slot';

type TokenType = string | null;

// ---------------------------------------------------------------------------
// Internal JWT / Auth types
// ---------------------------------------------------------------------------

interface JwtPayloadAppData {
    name?: string;
    domain?: string;
    domain_ssl?: boolean;
    portal_name?: string | null;
    portal_domain?: string | null;
    portal_domain_ssl?: boolean | null;
    type?: 'whitelabel' | 'site';
    uuid?: string;
    [key: string]: unknown;
}

interface JwtPayloadData {
    app?: JwtPayloadAppData;
    /** Admin permission keys embedded on token_type='admin' tokens. */
    permissions?: string[];
    [key: string]: unknown;
}

interface JwtPayload {
    iss?: string;
    aud?: string;
    iat?: number;
    nbf?: number;
    exp?: number;
    sub?: string;
    data?: JwtPayloadData;
    token_type?: string;
    [key: string]: unknown;
}

interface AuthContext {
    accessToken: string | null;
    tokenType: TokenType;
    tokenPayload: JwtPayload | null;
    isAuthenticated: boolean;
    isExpired: boolean;
    appIdentity: AppIdentity | null;
}

// ---------------------------------------------------------------------------
// Bootstrap / config types
// ---------------------------------------------------------------------------

interface BootstrapConfig {
    app?: Record<string, unknown>;
    shell?: Record<string, unknown>;
    auth?: {
        accessToken?: string | null;
        tokenType?: string | null;
        [key: string]: unknown;
    };
    site?: Record<string, unknown>;
    routing?: Record<string, unknown>;
    component?: {
        sessionEndpoint?: string;
        loginEndpoint?: string;
        resolveUriEndpoint?: string;
        manifestEndpointTemplate?: string;
        rootWidgetId?: string | null;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface SetAccessTokenOptions {
    tokenType?: string | null;
    emitEvent?: boolean;
}

interface ClearAccessTokenOptions {
    emitEvent?: boolean;
}

interface ManagerOptions {
    rootElement: HTMLElement;
    currentPath?: string;
    queryString?: string;
    hash?: string;
    bootstrap?: BootstrapConfig;
}

interface ApiFetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

interface LoadedWidgetModule {
    defineWidget?: () => Promise<void> | void;
    mount?: (element: HTMLElement, props?: Record<string, unknown>) => Promise<void> | void;
    [key: string]: unknown;
}

interface LoadedWidgetRecord {
    manifest: WidgetManifest;
    module: LoadedWidgetModule | null;
    dependencies: WidgetManifest[];
}

interface MountedWidgetElement extends HTMLElement {
    runtime?: WidgetRuntime;
    renderMode?: string;
    routingContext?: MountRoutingContext;
    __dyn_manifest_id__?: string;
    __dyn_parent_manifest_id__?: string;
    __dyn_slot_name__?: string | null;
    __dyn_component_props__?: Record<string, unknown>;
    /** Legacy compat aliases */
    __maxr_manifest_id__?: string;
    __maxr_parent_manifest_id__?: string;
    __maxr_slot_name__?: string | null;
    __maxr_component_props__?: Record<string, unknown>;
    /**
     * The widget ID that was active in this mount immediately before the current
     * component was loaded.  Used by navigateBack() to return there when there
     * is no browser-history entry to pop (i.e. the component was the entry point
     * from a direct URL load).
     */
    __dyn_source_widget_id__?: string;
    __dyn_source_path__?: string;
    __dyn_source_routing_context__?: MountRoutingContext;
}

// ---------------------------------------------------------------------------
// History state
// ---------------------------------------------------------------------------

interface HistoryState {
    __dyn__: true;
    mountId: string;
    widgetId: string;
    path: string;
    routingContext: MountRoutingContext | null;
}

// ---------------------------------------------------------------------------
// Known widget IDs
// ---------------------------------------------------------------------------

const MAIN_APP_WIDGET_IDS: Record<string, string> = {
    login: '122160fe-9981-4d3d-8218-fabdd279713a',
    account: '884f9a89-9df6-4c10-9c83-3b2d9f7d6a11',
    administrator: 'fdb6d0fe-2b7e-4709-a0f7-2ec2d6d8ea2b',
    group: '9e6fbbd4-f7f0-4fa7-b0a7-4ef5d2f4f1c9',
    persona: '3ca0b3a2-08b0-4df0-9049-78cf163e9d7d',
    site: '9e4bcfcb-a458-4bda-8c1c-671173b79df8',
    'forgot-password': 'a8a78b4c-d880-4226-85bb-7b3b8b262fc8',
    'create-account': '90346c8c-1c44-46bc-87c8-5afd3a2e0391',
};

/** Primary mount point id — the default target for all top-level navigation */
const PRIMARY_MOUNT_ID = 'primary';

// ---------------------------------------------------------------------------
// DynComponentManager
// ---------------------------------------------------------------------------

export class DynComponentManager {
    private rootElement: HTMLElement;
    private currentPath: string;
    private queryString: string;
    private hash: string;
    private bootstrap: BootstrapConfig;
    private appConfig: Record<string, unknown>;
    private shellConfig: Record<string, unknown>;
    private authConfig: BootstrapConfig['auth'];
    private siteConfig: Record<string, unknown>;
    private routingConfig: Record<string, unknown>;
    private componentConfig: NonNullable<BootstrapConfig['component']>;

    // Auth state
    private accessToken: string | null;
    private tokenPayload: JwtPayload | null;
    private tokenType: TokenType;
    private appIdentity: AppIdentity | null;
    private readonly accessTokenStorageKey = 'access_token';

    // Endpoints
    private sessionEndpoint: string;
    private loginEndpoint: string;
    private resolveUriEndpoint: string;
    private manifestEndpointTemplate: string;
    private rootWidgetId: string | null;

    // Manifest / module registries
    private manifestClient: DynamicManifestClient;
    private manifestRegistry: Map<string, WidgetManifest>;
    private moduleRegistry: Map<string, LoadedWidgetModule>;
    private dependencyRegistry: Map<string, WidgetManifest[]>;
    private widgetRegistry: Map<string, LoadedWidgetRecord>;

    // Asset tracking
    private loadedScriptEntries: Set<string>;
    private loadedStyleEntries: Set<string>;

    // Mount registry — keyed by mount id string
    private mountRegistry: Map<string, MountRecord>;

    // Routing context registry — keyed by mount id, stores the context passed when the component was loaded
    private routingContextRegistry: Map<string, MountRoutingContext>;

    // Event bus
    private eventTarget: EventTarget;

    // Breadcrumb label cache — maps a URL segment value (e.g. 'users', a UUID string)
    // to the human-readable label used in the header breadcrumb trail.
    private uriLabelCache: Map<string, string>;

    // Popstate listener reference (for cleanup)
    private readonly boundHandlePopState: (event: PopStateEvent) => void;

    // Full-screen overlay / modal system
    private floatShield!: FloatShield;

    constructor({
        rootElement,
        currentPath = '/',
        queryString = '',
        hash = '',
        bootstrap = {},
    }: ManagerOptions) {
        if (!(rootElement instanceof HTMLElement)) {
            throw new Error('DynComponentManager requires a valid rootElement.');
        }

        this.rootElement = rootElement;
        this.currentPath = currentPath;
        this.queryString = queryString;
        this.hash = hash;

        this.bootstrap = bootstrap || {};
        this.appConfig = bootstrap.app || {};
        this.shellConfig = bootstrap.shell || {};
        this.authConfig = bootstrap.auth || {};
        this.siteConfig = bootstrap.site || {};
        this.routingConfig = bootstrap.routing || {};
        this.componentConfig = bootstrap.component || {};

        this.manifestRegistry = new Map<string, WidgetManifest>();
        this.moduleRegistry = new Map<string, LoadedWidgetModule>();
        this.dependencyRegistry = new Map<string, WidgetManifest[]>();
        this.widgetRegistry = new Map<string, LoadedWidgetRecord>();
        this.mountRegistry = new Map<string, MountRecord>();
        this.routingContextRegistry = new Map<string, MountRoutingContext>();

        this.accessToken = null;
        this.tokenPayload = null;
        this.tokenType = null;
        this.appIdentity = null;

        this.sessionEndpoint = this.componentConfig.sessionEndpoint || '/api/v1/auth/session';
        this.loginEndpoint = this.componentConfig.loginEndpoint || '/api/v1/auth/login';
        this.resolveUriEndpoint =
            this.componentConfig.resolveUriEndpoint || '/api/v1/component/resolve-by-uri';
        this.manifestEndpointTemplate =
            this.componentConfig.manifestEndpointTemplate || '/api/v1/component/{id}/manifest';
        this.rootWidgetId = this.componentConfig.rootWidgetId || null;

        this.manifestClient = new DynamicManifestClient({
            resolveUriEndpoint: this.resolveUriEndpoint,
            manifestEndpointTemplate: this.manifestEndpointTemplate,
            accessTokenProvider: () => this.getAccessToken(),
        });

        this.eventTarget = new EventTarget();
        this.loadedScriptEntries = new Set<string>();
        this.loadedStyleEntries = new Set<string>();
        this.uriLabelCache = new Map<string, string>();

        this.boundHandlePopState = this.handlePopState.bind(this);
        window.addEventListener('popstate', this.boundHandlePopState);

        void defineDynSlotElement();
        void defineDynMountElement();

        this.bootstrapAuthState();
    }

    // -------------------------------------------------------------------------
    // Auth bootstrapping
    // -------------------------------------------------------------------------

    bootstrapAuthState(): void {
        const bootstrapToken = this.authConfig?.accessToken || null;
        const bootstrapTokenType = this.authConfig?.tokenType || null;

        if (bootstrapToken) {
            this.setAccessToken(bootstrapToken, {
                tokenType: bootstrapTokenType,
                emitEvent: false,
            });
            return;
        }

        if (bootstrapTokenType) {
            this.tokenType = bootstrapTokenType;
        }
    }

    // -------------------------------------------------------------------------
    // Main entry point
    // -------------------------------------------------------------------------

    async run(): Promise<void> {
        await this.fetchSessionTokenIfNeeded().catch(() => {
            // Public routes may not have a session yet.
        });

        this.renderInitialShell();
        await this.loadInitialRoute();
    }

    // -------------------------------------------------------------------------
    // Routing
    // -------------------------------------------------------------------------

    async loadInitialRoute(): Promise<void> {
        const firstSegment = this.getFirstPathSegment();
        const tokenType = this.getTokenType();

        if (firstSegment === 'login') {
            if (tokenType === 'user' || tokenType === 'admin') {
                window.location.assign('/account');
                return;
            }
            if (tokenType === 'admin') {
                window.location.assign('/administrator');
                return;
            }
        }

        if (firstSegment === 'administrator' && tokenType !== 'admin') {
            window.location.assign('/login');
            return;
        }

        if (firstSegment === 'accounnt' && tokenType === 'admin') {
            window.location.assign('/administrator');
            return;
        }

        if (firstSegment === 'account' && tokenType !== 'user' && tokenType !== 'admin') {
            window.location.assign('/login');
            return;
        }

        const resolvedWidgetId = this.resolveRootWidgetIdFromPath();

        if (!resolvedWidgetId) {
            this.renderErrorState('Unable to resolve a root widget for this route.');
            return;
        }

        this.rootWidgetId = resolvedWidgetId;

        const manifest = await this.manifestClient.getManifestById(resolvedWidgetId);

        // Hook 1: seed breadcrumb label for the root segment (e.g. 'administrator')
        // from the root manifest if it declares one.
        if (manifest.breadcrumbLabel && firstSegment) {
            this.uriLabelCache.set(firstSegment, manifest.breadcrumbLabel);
        }

        await this.loadWidgetGraph(manifest);

        const rootContext: MountRoutingContext = {
            behavior: 'route',
            anchorSegment: firstSegment,
            anchorDepth: 0,
        };

        // Mount the root component into the primary mount
        const rootElement = await this.mountManifest(manifest, {}, rootContext);

        // Always walk the URI chain — even with no remaining segments, resolveUriChain
        // handles the "/" default slot dep via mountSlotDependencies.
        const segments = this.getPathSegments();
        const remainingSegments = segments.slice(1); // everything after the root anchor
        await this.resolveUriChain(
            remainingSegments,
            manifest,
            rootElement,
            rootContext,
            1
        );

        // Stamp the initial browser-history entry with __dyn__ metadata so that
        // when the user navigates forward and then hits Back, handlePopState has
        // a valid state to restore rather than falling through the guard.
        this.replaceInitialHistoryState();
    }

    /**
     * After the initial route chain has fully resolved, stamp the browser's
     * existing history entry (via replaceState, not pushState) with __dyn__
     * metadata pointing at the deepest active mount.
     *
     * This ensures that when the user navigates forward and then presses Back,
     * handlePopState receives a __dyn__ state and can restore the correct view
     * instead of hitting the early-return guard.
     */
    private replaceInitialHistoryState(): void {
        // Walk every registered mount and find the one with the longest activePath
        // that actually has a component loaded — that is the "leaf" the user sees.
        let leafRecord: MountRecord | null = null;
        let maxDepth = -1;

        for (const record of this.mountRegistry.values()) {
            if (!record.activeManifestId) continue;
            const depth = record.activePath
                ? record.activePath.replace(/^\/|\/$/g, '').split('/').filter(Boolean).length
                : 0;
            if (depth > maxDepth) {
                maxDepth = depth;
                leafRecord = record;
            }
        }

        if (!leafRecord?.activeManifestId) return;

        const url = (leafRecord.activePath || this.currentPath);
        const normalizedUrl = url.startsWith('/') ? url : `/${url}`;

        // Stamp the current browser entry with __dyn__ metadata.
        // NOTE: we do NOT pushState a parent entry here — doing so and then
        // replaceState immediately after would overwrite the pushed entry,
        // leaving duplicate leaf entries and breaking browser-back navigation.
        // Instead, navigateBack() Case 3 resolves the parent widget on demand
        // from the manifest registry when the user actually presses back.
        const state: HistoryState = {
            __dyn__:        true,
            mountId:        leafRecord.id,
            widgetId:       leafRecord.activeManifestId,
            path:           normalizedUrl,
            routingContext: leafRecord.routingContext,
        };

        window.history.replaceState(state, '', normalizedUrl);

        // Hook 2: broadcast breadcrumbs now that the initial route is fully resolved.
        this.rebuildAndBroadcastCrumbs();
    }

    resolveRootWidgetIdFromPath(): string | null {
        const firstSegment = this.getFirstPathSegment();

        if (firstSegment && MAIN_APP_WIDGET_IDS[firstSegment]) {
            return MAIN_APP_WIDGET_IDS[firstSegment];
        }

        if (this.rootWidgetId) {
            return this.rootWidgetId;
        }

        return null;
    }

    getFirstPathSegment(): string {
        const normalized = this.currentPath.replace(/^\/+|\/+$/g, '');
        if (!normalized) return '';
        const [firstSegment] = normalized.split('/');
        return (firstSegment || '').toLowerCase();
    }

    // -------------------------------------------------------------------------
    // Mount point management
    // -------------------------------------------------------------------------

    /**
     * Register a mount point in the mountRegistry.
     *
     * Three modes:
     *  1. `directElement` provided — adopt that element as-is as the mount container.
     *  2. `hostElement` provided — search its shadow/light DOM for `<dyn-mount id="mountId">`.
     *  3. Neither provided (primary mount) — create a plain <div>.
     */
    private createMountPoint(
        mountId: string,
        path: string | null = null,
        hostElement?: HTMLElement | ShadowRoot,
        directElement?: HTMLElement
    ): MountRecord {
        if (this.mountRegistry.has(mountId)) {
            return this.mountRegistry.get(mountId)!;
        }

        let mountElement: HTMLElement;

        if (directElement) {
            // Caller already has the exact element — adopt it directly.
            mountElement = directElement;
            mountElement.setAttribute('data-dyn-mount-id', mountId);

        } else if (hostElement) {
            // Search the widget's shadow or light DOM for <dyn-mount id="mountId">
            const dynMountSelector = 'dyn-mount';
            const found = hostElement.querySelector(
                `${dynMountSelector}[id="${mountId}"]`
            ) as HTMLElement | null;

            if (found) {
                mountElement = found;
                mountElement.setAttribute('data-dyn-mount-id', mountId);
            } else {
                // <dyn-mount> not in DOM yet — create a fallback div and warn.
                console.warn(
                    `DynComponentManager: no <dyn-mount id="${mountId}"> found inside host element. ` +
                    `A fallback <div> will be used. Make sure the widget has rendered before slot deps are mounted.`
                );
                mountElement = document.createElement('div');
                mountElement.id = `dyn-mount-${mountId}`;
                mountElement.setAttribute('data-dyn-mount-id', mountId);
                mountElement.style.position = 'relative';
                mountElement.style.overflow = 'hidden';
                (hostElement as HTMLElement).appendChild?.(mountElement);
            }

        } else {
            // Primary mount — create and append to rootElement.
            mountElement = document.createElement('div');
            mountElement.id = `dyn-mount-${mountId}`;
            mountElement.setAttribute('data-dyn-mount-id', mountId);
            mountElement.style.position = 'relative';
            mountElement.style.overflow = 'hidden';
        }

        const record: MountRecord = {
            id: mountId,
            mountElement,
            activeWidgetElement: null,
            activeManifestId: null,
            history: [],
            path,
            activePath: null,
            routingContext: null,
        };

        this.mountRegistry.set(mountId, record);
        return record;
    }

    getMountRecord(mountId: string = PRIMARY_MOUNT_ID): MountRecord | null {
        return this.mountRegistry.get(mountId) || null;
    }

    // -------------------------------------------------------------------------
    // Public navigation API
    // -------------------------------------------------------------------------

    /**
     * Load a widget by id into a mount point, with optional CSS transition.
     * This is the primary API exposed to widgets via runtime.loadComponentById.
     */
    async loadComponentById(
        widgetId: string,
        options: LoadComponentOptions = {}
    ): Promise<void> {
        const {
            transitionType = 'none',
            transitionSpeed = 0.4,
            mountId = PRIMARY_MOUNT_ID,
            pushHistory = true,
            path,
            routingContext = null,
            skipSlotResolution = false,
            skipSourceStamp = false,
            historyOp,
        } = options;

        // Resolve effective history operation:
        // • explicit historyOp always wins
        // • silent/setup loads (transitionType:'none') default to 'none'
        // • animated user navigations default to 'push'
        const effectiveHistoryOp: 'push' | 'pop' | 'none' =
            historyOp ?? (transitionType === 'none' ? 'none' : 'push');

        // Resolve or create mount record
        let mountRecord = this.mountRegistry.get(mountId);
        if (!mountRecord) {
            const dynMountSelector = 'dyn-mount';
            const existingDynMount = document.querySelector(
                `${dynMountSelector}[id="${mountId}"]`
            ) as HTMLElement | null;

            if (existingDynMount) {
                mountRecord = this.createMountPoint(mountId, path || null, undefined, existingDynMount);
            } else {
                mountRecord = this.createMountPoint(mountId, path || null);
                const primaryRecord = this.mountRegistry.get(PRIMARY_MOUNT_ID);
                const parent = primaryRecord ? primaryRecord.mountElement : this.rootElement;
                parent.appendChild(mountRecord.mountElement);
            }
        }

        // Capture the outgoing context BEFORE overwriting it on the record.
        // This is used below to stamp __dyn_source_routing_context__ on the new
        // element so that navigateBack() Case 2 can restore the correct context
        // (e.g. the user dashboard's routeParams: { uuid: userUUID }) rather than
        // the incoming component's context (e.g. routeParams: { uuid: siteUUID }).
        const previousRoutingContext = mountRecord.routingContext;

        // Store routing context on the record so slot deps and navigateTo can read it
        if (routingContext) {
            mountRecord.routingContext = routingContext;
            this.routingContextRegistry.set(mountId, routingContext);
        }

        // Load the full graph if not already cached
        let manifest = this.manifestRegistry.get(widgetId) || null;
        if (!manifest) {
            manifest = await this.manifestClient.getManifestById(widgetId);
            await this.loadWidgetGraph(manifest);
        } else if (!this.widgetRegistry.has(widgetId)) {
            await this.installManifestAssets(manifest);
        }

        const newElement = await this.createWidgetElement(manifest, {}, routingContext, mountId);
        newElement.style.position = 'absolute';
        newElement.style.top = '0';
        newElement.style.left = '0';
        newElement.style.width = '100%';

        const previousElement    = mountRecord.activeWidgetElement;
        const previousManifestId = mountRecord.activeManifestId;
        const previousPath       = mountRecord.activePath;

        if (effectiveHistoryOp === 'push' && previousManifestId) {
            mountRecord.history.push(previousManifestId);
        } else if (effectiveHistoryOp === 'pop') {
            mountRecord.history.pop();
        }
        // effectiveHistoryOp === 'none' → leave history untouched

        mountRecord.activeWidgetElement = newElement;
        mountRecord.activeManifestId    = widgetId;

        // ── Stamp source navigation info ──────────────────────────────────────
        // Allows navigateBack() to return here intelligently:
        //   - if browser history exists → window.history.back()  (popstate handles it)
        //   - if this was a direct/fresh URL load → loadComponentById(sourceId, right)
        // skipSourceStamp=true suppresses this so navigateBack() Case 2 doesn't
        // create a circular chain (e.g. user-dashboard ↔ site-dashboard loop).
        if (previousManifestId && !skipSourceStamp) {
            newElement.__dyn_source_widget_id__       = previousManifestId;
            newElement.__dyn_source_path__            = previousPath            ?? undefined;
            newElement.__dyn_source_routing_context__ = previousRoutingContext  ?? undefined;
        }

        mountRecord.mountElement.appendChild(newElement);

        await this.waitForElementRender(newElement);
        await this.mountInlineDependenciesForParent(newElement, manifest, {});

        // Only run slot resolution when not being called from resolveUriChain —
        // resolveUriChain owns its own recursive slot resolution and calling
        // mountSlotDependencies here would re-run the wrong path-matching logic.
        if (!skipSlotResolution) {
            await this.mountSlotDependencies(manifest, newElement, routingContext);
        }

        await this.executeTransition(
            mountRecord.mountElement,
            previousElement,
            newElement,
            transitionType,
            transitionSpeed
        );

        if (previousElement && previousElement.parentElement) {
            previousElement.parentElement.removeChild(previousElement);
        }

        // ── URL derivation ────────────────────────────────────────────────────
        // Explicit path always wins.  Otherwise we build from routingContext.
        //
        // CHILD navigation (newDepth > mountCurrentDepth):
        //   The new component goes deeper than what the mount currently holds.
        //   Use the mount's activePath as the base so the full ancestry is
        //   preserved even when this.currentPath hasn't been updated yet
        //   (e.g. pushHistory:false slot loads).
        //   e.g. mount at /account/sites + uuid → /account/sites/{uuid}
        //
        // SIBLING / REPLACEMENT navigation (newDepth <= mountCurrentDepth):
        //   Standard behaviour — derive from global path segments at anchorDepth.
        let effectivePath: string | null = path ?? null;

        if (!effectivePath && routingContext?.behavior === 'route') {
            const mountCurrentContext = mountRecord.routingContext;
            const mountCurrentDepth  = mountCurrentContext?.anchorDepth ?? -1;
            const newDepth           = routingContext.anchorDepth ?? 0;

            if (mountRecord.activePath && mountCurrentContext && newDepth > mountCurrentDepth) {
                // Child — append new anchor to the mount's known full path.
                // anchorSegment "/" means "default at this depth" — no extra segment.
                const anchor = routingContext.anchorSegment;
                effectivePath = anchor === '/'
                    ? mountRecord.activePath.replace(/\/+$/, '') || '/'
                    : mountRecord.activePath.replace(/\/+$/, '') + '/' + anchor;
            } else {
                effectivePath = this.buildRoutePath(routingContext);
            }
        } else if (!effectivePath && routingContext?.behavior === 'modal') {
            effectivePath = this.buildModalUrl(routingContext);
        }

        // Always keep the mount's activePath current so future child navigations
        // can build correct URLs regardless of browser-history state.
        if (effectivePath) {
            mountRecord.activePath = effectivePath;
        }

        if (pushHistory && effectivePath) {
            this.pushHistoryState(effectivePath, widgetId, mountId, routingContext);
            // Hook 4: re-broadcast breadcrumbs on every user-initiated navigation.
            this.rebuildAndBroadcastCrumbs();
        }

        this.dispatch('widget:mounted', {
            manifest,
            mountId,
            routingContext,
            currentPath: effectivePath || this.currentPath,
        });
    }

    async navigateBack(mountId: string = PRIMARY_MOUNT_ID): Promise<void> {
        const mountRecord = this.mountRegistry.get(mountId);
        if (!mountRecord) return;

        // ── Case 1: navigated here via the component system ──────────────────
        // mountRecord.history is non-empty, meaning something was shown before.
        // Call window.history.back() so the browser's own stack is consumed and
        // the address bar updates correctly.  handlePopState fires automatically
        // and reloads the previous widget with a 'right' slide transition.
        if (mountRecord.history.length > 0) {
            window.history.back();
            return;
        }

        // ── Case 2: fresh URL load — explicit source info on the element ──────
        // The element carries __dyn_source_widget_id__ set when its predecessor
        // (e.g. the owning list) was visible in this mount just before this load.
        const currentEl     = mountRecord.activeWidgetElement as MountedWidgetElement | null;
        const sourceId      = currentEl?.__dyn_source_widget_id__;
        const sourcePath    = currentEl?.__dyn_source_path__;
        const sourceContext = currentEl?.__dyn_source_routing_context__;

        if (sourceId) {
            await this.loadComponentById(sourceId, {
                mountId,
                transitionType:  'right',
                pushHistory:     true,
                historyOp:       'none',        // don't push site-dashboard onto mountRecord.history
                skipSourceStamp: true,          // don't stamp __dyn_source_* so the next back
                                                // press falls through to Case 3 (→ parent list)
                path:           sourcePath,
                routingContext: sourceContext,
            });
            return;
        }

        // ── Case 3: fresh URL load — no source info (UUID was first in mount) ─
        // replaceInitialHistoryState() only does a replaceState (no parent entry
        // is pushed), so calling window.history.back() would land on the same URL
        // and loop forever.  Instead, derive the parent URL by stripping the
        // trailing UUID segment from the active path and navigate there directly.
        {
            const UUID_RE = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const leafUrl = mountRecord.activePath ?? this.currentPath;

            if (UUID_RE.test(leafUrl)) {
                const parentUrl = leafUrl.replace(UUID_RE, '') || '/';

                let parentWidgetId: string | null = null;
                let parentContext: MountRoutingContext | null = null;

                for (const manifest of this.manifestRegistry.values()) {
                    if (manifest.uri !== parentUrl) continue;

                    const dep = (manifest.dependencies ?? []).find(
                        d => d.type === 'parent-slot' &&
                             d.mount_id === mountId &&
                             ((d.path ?? '/').replace(/^\/+/, '') === '' ||
                              (d.path ?? '/') === '/')
                    );

                    if (dep) {
                        parentWidgetId = dep.id;
                        const segs = parentUrl.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
                        parentContext = {
                            behavior:      mountRecord.routingContext?.behavior ?? 'route',
                            anchorSegment: segs[segs.length - 1] ?? '/',
                            anchorDepth:   segs.length > 0 ? segs.length - 1 : 0,
                        };
                        break;
                    }
                }

                if (parentWidgetId) {
                    await this.loadComponentById(parentWidgetId, {
                        mountId,
                        transitionType: 'right',
                        pushHistory:    true,
                        path:           parentUrl,
                        routingContext: parentContext,
                    });
                    return;
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Transition engine
    // -------------------------------------------------------------------------

    private executeTransition(
        container: HTMLElement,
        outgoing: HTMLElement | null,
        incoming: HTMLElement,
        type: TransitionType,
        speed: number
    ): Promise<void> {
        return new Promise<void>((resolve) => {
            if (type === 'none' || !outgoing) {
                // No animation — strip the absolute positioning added before the call
                // and make the incoming element a normal block in the flow.
                incoming.style.position = '';
                incoming.style.top      = '';
                incoming.style.left     = '';
                incoming.style.width    = '';
                resolve();
                return;
            }

            const duration   = `${speed}s`;
            const easing     = 'ease';
            const transition = `${duration} ${easing}`;

            if (type === 'fade') {
                incoming.style.opacity    = '0';
                incoming.style.transition = `opacity ${transition}`;
                outgoing.style.transition = `opacity ${transition}`;

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        incoming.style.opacity = '1';
                        outgoing.style.opacity = '0';
                    });
                });

                // Guard by target + propertyName so bubbled transitionend events
                // from child elements (e.g. a card with box-shadow transition)
                // do not fire the cleanup before the real opacity transition ends.
                const onFadeEnd = (e: TransitionEvent) => {
                    if (e.target !== incoming || e.propertyName !== 'opacity') return;
                    incoming.removeEventListener('transitionend', onFadeEnd);
                    incoming.style.position   = '';
                    incoming.style.top        = '';
                    incoming.style.left       = '';
                    incoming.style.width      = '';
                    incoming.style.opacity    = '';
                    incoming.style.transition = '';
                    resolve();
                };
                incoming.addEventListener('transitionend', onFadeEnd);

                return;
            }

            // ── Simultaneous slide ────────────────────────────────────────────
            // Both panels must be absolutely positioned and the container must
            // have a locked height + overflow:hidden so they clip correctly as
            // they scroll past each other.
            //
            // "left"  → outgoing exits to left  (-100%), incoming enters from right (+100%)
            // "right" → outgoing exits to right (+100%), incoming enters from left  (-100%)

            const outgoingExit  = type === 'left' ? '-100%' : '100%';
            const incomingEntry = type === 'left' ?  '100%' : '-100%';

            // 1. Measure the container BEFORE touching any styles.
            const containerRect = container.getBoundingClientRect();

            // 2. Lock container dimensions so it doesn't collapse when both
            //    children are taken out of normal flow.
            container.style.position = 'relative';
            container.style.overflow = 'hidden';
            container.style.height   = `${containerRect.height}px`;

            // 3. Force both elements to be absolutely positioned and full-width
            //    (the outgoing element had its position cleared by the last
            //    transition's cleanup; the incoming was set before this call).
            const pinAbsolute = (el: HTMLElement) => {
                el.style.position = 'absolute';
                el.style.top      = '0';
                el.style.left     = '0';
                el.style.width    = '100%';
                el.style.height   = '100%';
            };

            pinAbsolute(outgoing);
            pinAbsolute(incoming);

            // 4. Park incoming off-screen (no transition yet).
            incoming.style.transform  = `translateX(${incomingEntry})`;
            incoming.style.transition = 'none';
            outgoing.style.transition = 'none';
            outgoing.style.transform  = 'translateX(0)';

            // 5. One rAF to flush the off-screen position, then a second to
            //    start both CSS transitions simultaneously.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    incoming.style.transition = `transform ${transition}`;
                    outgoing.style.transition = `transform ${transition}`;

                    incoming.style.transform = 'translateX(0)';
                    outgoing.style.transform = `translateX(${outgoingExit})`;
                });
            });

            // 6. Clean up once the incoming panel's slide has fully settled.
            //    Guard with target+propertyName so bubbled transitionend events
            //    from child elements (e.g. .ent-card box-shadow, .back-btn
            //    background) don't prematurely fire the cleanup at ~0.12 s
            //    instead of the full 0.4 s slide duration.
            const onSlideEnd = (e: TransitionEvent) => {
                if (e.target !== incoming || e.propertyName !== 'transform') return;
                incoming.removeEventListener('transitionend', onSlideEnd);

                // Restore incoming to normal flow
                incoming.style.position   = '';
                incoming.style.top        = '';
                incoming.style.left       = '';
                incoming.style.width      = '';
                incoming.style.height     = '';
                incoming.style.transform  = '';
                incoming.style.transition = '';

                // Release the container dimension + clipping lock so it doesn't
                // bleed into subsequent transitions on the same mount element.
                container.style.height   = '';
                container.style.overflow = '';
                container.style.position = '';
                resolve();
            };
            incoming.addEventListener('transitionend', onSlideEnd);
        });
    }

    // -------------------------------------------------------------------------
    // Browser history
    // -------------------------------------------------------------------------

    private pushHistoryState(
        path: string,
        widgetId: string,
        mountId: string,
        routingContext: MountRoutingContext | null = null
    ): void {
        const state: HistoryState = {
            __dyn__: true,
            mountId,
            widgetId,
            path,
            routingContext,
        };
        const url = path.startsWith('/') ? path : `/${path}`;
        window.history.pushState(state, '', url);
        this.currentPath = url;
    }

    private handlePopState(event: PopStateEvent): void {
        const state = event.state as HistoryState | null;

        if (!state || !state.__dyn__) {
            return;
        }

        // Update currentPath first so buildRoutePath inside loadComponentById
        // sees the correct global path during the restore load.
        this.currentPath = state.path.startsWith('/') ? state.path : `/${state.path}`;

        // Broadcast updated breadcrumbs immediately so the header reflects the
        // popped URL before the replaced component finishes mounting.
        this.rebuildAndBroadcastCrumbs();

        // Wind the mount's activePath back to the popped state's path so that
        // any subsequent forward navigation from the restored view builds URLs
        // from the correct base rather than the stale forward path.
        const mountRecord = this.mountRegistry.get(state.mountId);
        if (mountRecord) {
            mountRecord.activePath = this.currentPath;
        }

        void this.loadComponentById(state.widgetId, {
            mountId:        state.mountId,
            pushHistory:    false,
            transitionType: 'right',
            historyOp:      'pop',
            routingContext: state.routingContext ?? undefined,
        });
    }

    // -------------------------------------------------------------------------
    // Widget graph loading
    // -------------------------------------------------------------------------

    async loadWidgetGraph(rootManifest: WidgetManifest): Promise<void> {
        const visited = new Set<string>();
        await this.loadManifestRecursive(rootManifest, visited);
    }

    private async loadManifestRecursive(
        manifest: WidgetManifest,
        visited: Set<string>
    ): Promise<void> {
        if (visited.has(manifest.id)) return;
        visited.add(manifest.id);

        this.registerManifest(manifest);

        const dependencyManifests: WidgetManifest[] = [];

        for (const dependency of manifest.dependencies || []) {
            // slot-type deps are mounted separately via the mount system —
            // we still need to load their manifests so they are in cache,
            // but we skip recursive asset installation here.
            const dependencyManifest = await this.manifestClient.getManifestById(dependency.id);
            this.registerManifest(dependencyManifest);
            dependencyManifests.push(dependencyManifest);

            if ((dependency.type || 'inline') !== 'slot') {
                await this.loadManifestRecursive(dependencyManifest, visited);
            }
        }

        this.registerDependencyGraph(manifest.id, dependencyManifests);
        await this.installManifestAssets(manifest);
    }

    private async installManifestAssets(manifest: WidgetManifest): Promise<void> {
        if (manifest.cssPath) {
            this.installStylesheet(manifest.cssPath);
        }

        if (!this.moduleRegistry.has(manifest.id)) {
            // A parent widget (e.g. user-dashboard) may have bundled this widget's
            // code inline, causing its @customElement decorator to already run and
            // register the element.  If we try to import the standalone bundle a
            // second time the decorator fires again and customElements.define throws
            // a NotSupportedError, aborting the entire resolveUriChain.
            //
            // Guard: if the element name is already registered we skip the import
            // and record an empty module placeholder — the element is fully usable
            // because the parent bundle already set it up.
            const alreadyRegistered =
                !!manifest.el_name && !!customElements.get(manifest.el_name);

            if (alreadyRegistered) {
                this.registerModule(manifest.id, {});
            } else {
                const module = await this.importModuleFromEntry(manifest.entry);
                this.registerModule(manifest.id, module);
                await this.runDefineExportIfPresent(module, manifest);
            }
        }

        const dependencies = this.dependencyRegistry.get(manifest.id) || [];

        this.widgetRegistry.set(manifest.id, {
            manifest,
            module: this.moduleRegistry.get(manifest.id) || null,
            dependencies,
        });
    }

    // -------------------------------------------------------------------------
    // Mount operations
    // -------------------------------------------------------------------------

    private async mountManifest(
        manifest: WidgetManifest,
        props: Record<string, unknown> = {},
        routingContext: MountRoutingContext | null = null
    ): Promise<MountedWidgetElement> {
        const primaryRecord = this.mountRegistry.get(PRIMARY_MOUNT_ID);

        if (!primaryRecord) {
            throw new Error('Primary mount record was not found. Did renderInitialShell run?');
        }

        if (routingContext) {
            primaryRecord.routingContext = routingContext;
            this.routingContextRegistry.set(PRIMARY_MOUNT_ID, routingContext);
        }

        // Seed the primary mount's activePath so child mounts can inherit a base.
        primaryRecord.activePath = routingContext
            ? this.buildRoutePath(routingContext)
            : this.currentPath;

        const target = primaryRecord.mountElement;
        target.innerHTML = '';

        const element = await this.createWidgetElement(manifest, props, routingContext, PRIMARY_MOUNT_ID);
        target.appendChild(element);

        primaryRecord.activeWidgetElement = element;
        primaryRecord.activeManifestId = manifest.id;

        await this.waitForElementRender(element);
        await this.mountInlineDependenciesForParent(element, manifest, props);

        // Note: slot dependencies are NOT mounted here — they are resolved by
        // resolveUriChain after mountManifest returns, so it can handle the
        // full URI segment walk including getByUri fallback for unknown segments.

        this.dispatch('widget:mounted', {
            manifest,
            mountId: PRIMARY_MOUNT_ID,
            routingContext,
            currentPath: this.currentPath,
            queryString: this.queryString,
            hash: this.hash,
        });

        return element;
    }

    // -------------------------------------------------------------------------
    // URI chain resolution
    // -------------------------------------------------------------------------

    /** Matches a lowercase UUID v4 string */
    private static readonly UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    /** Matches a positive integer string */
    private static readonly INT_RE = /^\d+$/;

    private isUuidSegment(segment: string): boolean {
        return DynComponentManager.UUID_RE.test(segment);
    }

    private isIntSegment(segment: string): boolean {
        return DynComponentManager.INT_RE.test(segment);
    }

    /**
     * Identify which wildcard pattern (if any) a segment matches.
     * Returns the pattern key ("uuid" | "int") or null for plain named segments.
     */
    private getWildcardPattern(segment: string): 'uuid' | 'int' | null {
        if (this.isUuidSegment(segment)) return 'uuid';
        if (this.isIntSegment(segment)) return 'int';
        return null;
    }

    /**
     * Recursively walk the remaining URI segments, resolving and mounting
     * components at each depth. For each segment:
     *
     *  1. Check the current component's slot deps for a matching `path`.
     *  2. If found → mount that dep and recurse with the next segment.
     *  3. If not found → call getByUri("parentUri/segment") to discover the
     *     component dynamically, then check its deps for a `parent-slot` entry
     *     pointing back at a <dyn-mount> in the parent template.
     *  4. UUID segments are treated as parameter values and passed as context
     *     to the loaded component via routingContext.
     */
    private async resolveUriChain(
        remainingSegments: string[],
        parentManifest: WidgetManifest,
        parentElement: MountedWidgetElement,
        parentContext: MountRoutingContext,
        currentDepth: number
    ): Promise<void> {
        if (!remainingSegments.length) {
            // No more segments — mount the default slot dep ("/") if one exists
            console.debug(
                `[resolveUriChain] depth=${currentDepth} no remaining segments → mountSlotDependencies`,
                { manifestId: parentManifest.id, deps: parentManifest.dependencies }
            );
            await this.mountSlotDependencies(parentManifest, parentElement, parentContext);
            return;
        }

        const [segment, ...rest] = remainingSegments;
        const isUuid = this.isUuidSegment(segment);

        const slotDeps = (parentManifest.dependencies || []).filter(
            d => d.type === 'slot' || d.type === 'parent-slot'
        );

        console.debug(
            `[resolveUriChain] depth=${currentDepth} segment="${segment}" isUuid=${isUuid}`,
            {
                manifestId: parentManifest.id,
                slotDeps: slotDeps.map(d => ({ id: d.id, path: d.path, mount_id: d.mount_id, type: d.type })),
                restSegments: rest,
            }
        );

        // Try to find a direct dep path match first
        const matchedDep = this.findSlotDepForSegment(slotDeps, segment);

        console.debug(
            `[resolveUriChain] depth=${currentDepth} segment="${segment}" matchedDep=`,
            matchedDep ? { id: matchedDep.id, path: matchedDep.path, mount_id: matchedDep.mount_id } : null
        );

        if (matchedDep) {
            await this.mountDepFromChain(
                matchedDep,
                segment,
                isUuid,
                rest,
                parentContext,
                currentDepth
            );
            return;
        }

        // No dep matched — call manifest-by-uri to discover the component dynamically.
        // This replaces the old two-step resolve-by-uri → manifest waterfall.
        if (!isUuid) {
            const parentUri = parentManifest.uri?.replace(/\/+$/, '') ?? '';
            const lookupUri = `${parentUri}/${segment}`;

            let resolvedManifest: WidgetManifest | null = null;
            try {
                resolvedManifest = await this.manifestClient.getManifestByUri(lookupUri);
                if (resolvedManifest) {
                    // Hook 3: seed breadcrumb label for this named segment from the
                    // resolved manifest (e.g. users-shell declares "Users").
                    if (resolvedManifest.breadcrumbLabel) {
                        this.uriLabelCache.set(segment, resolvedManifest.breadcrumbLabel);
                    }
                    await this.loadWidgetGraph(resolvedManifest);
                }
            } catch {
                console.warn(
                    `DynComponentManager.resolveUriChain: getManifestByUri("${lookupUri}") failed. ` +
                    `Segment "${segment}" cannot be resolved.`
                );
            }

            if (resolvedManifest) {
                // The resolved manifest (e.g. account/sites/shell) is a declaration
                // vehicle — it carries parent-slot deps that tell us:
                //   - mount_id: which <dyn-mount> in the parent to target
                //   - id: which component to load into that mount
                //   - path: which path activates this dep
                //
                // We do NOT mount the shell itself. Instead we:
                // 1. Find all parent-slot deps grouped by mount_id
                // 2. For each group, resolve the active dep by path
                // 3. Load that dep's component into the parent's <dyn-mount>

                const parentSlotDeps = (resolvedManifest.dependencies || []).filter(
                    d => d.type === 'parent-slot' && d.mount_id
                );

                if (parentSlotDeps.length > 0) {
                    // Group by mount_id (multiple parent-slot deps can share a mount)
                    const depsByMountId = new Map<string, WidgetDependency[]>();
                    for (const dep of parentSlotDeps) {
                        const mid = dep.mount_id!;
                        if (!depsByMountId.has(mid)) depsByMountId.set(mid, []);
                        depsByMountId.get(mid)!.push(dep);
                    }

                    // Build a synthetic child context one depth below the current segment
                    const chainContext: MountRoutingContext = {
                        behavior: parentContext.behavior,
                        anchorSegment: segment,
                        anchorDepth: currentDepth,
                    };

                    for (const [parentMountId, depsForMount] of depsByMountId.entries()) {
                        const activeDep = this.resolveActiveSlotDep(depsForMount, chainContext);
                        if (!activeDep) continue;

                        // Build the correct child context — this captures UUID values
                        // in modalValue when the dep path is "{uuid}"
                        const depContext = this.buildChildRoutingContext(activeDep, chainContext);

                        await this.mountDepIntoParentSlot(
                            activeDep.id,
                            parentMountId,
                            parentElement,
                            depContext
                        );

                        // Recurse into remaining segments if any
                        if (rest.length > 0) {
                            const depManifest = this.manifestRegistry.get(activeDep.id);
                            const mountedEl = this.mountRegistry.get(parentMountId)
                                ?.activeWidgetElement as MountedWidgetElement | null;
                            if (depManifest && mountedEl) {
                                await this.resolveUriChain(
                                    rest,
                                    depManifest,
                                    mountedEl,
                                    depContext,
                                    currentDepth + 2
                                );
                            }
                        }
                    }
                } else {
                    // No parent-slot deps — fall back to mounting slot deps normally
                    await this.mountSlotDependencies(resolvedManifest, parentElement, parentContext);
                }
            } else {
                // getManifestByUri returned null — nothing registered for this segment.
                // Fall back to the default "/" slot dep so the page isn't left blank.
                console.info(
                    `DynComponentManager.resolveUriChain: no component found for segment "${segment}", ` +
                    `falling back to default slot dep.`
                );
                await this.mountSlotDependencies(parentManifest, parentElement, parentContext);
            }
        } else {
            // UUID segment with no matching dep — pass it through as context and continue
            console.info(
                `DynComponentManager.resolveUriChain: UUID segment "${segment}" has no dep match, ` +
                `continuing chain with remaining segments.`
            );
            if (rest.length > 0) {
                await this.resolveUriChain(
                    rest,
                    parentManifest,
                    parentElement,
                    parentContext,
                    currentDepth
                );
            } else {
                // UUID was the last segment and nothing matched — load the default dep
                await this.mountSlotDependencies(parentManifest, parentElement, parentContext);
            }
        }
    }

    /**
     * Find a slot or parent-slot dep that matches the current segment.
     * Handles three cases:
     *  - Exact path match:  dep.path === "/my-sites" and segment === "my-sites"
     *  - Default route:     dep.path === "/" and segment is empty/root
     *  - UUID wildcard:     dep.path === "{uuid}" and segment is a UUID
     */
    private findSlotDepForSegment(
        deps: WidgetDependency[],
        segment: string
    ): WidgetDependency | null {
        const sorted = [...deps].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const wildcardPattern = this.getWildcardPattern(segment);

        // Wildcard match — segment is a UUID or int, find a dep whose path is that pattern
        if (wildcardPattern) {
            const wildDep = sorted.find(d => {
                const p = (d.path ?? '').replace(/^\/+/, '');
                return p === `{${wildcardPattern}}`;
            });
            if (wildDep) return wildDep;
        }

        // Exact named segment match
        const exact = sorted.find(d => {
            const p = (d.path ?? '').replace(/^\/+/, '');
            return p !== '' && p !== '{uuid}' && p !== '{int}' && p === segment;
        });
        return exact ?? null;
    }

    /**
     * Mount a dep that was found via findSlotDepForSegment as part of the URI chain.
     */
    private async mountDepFromChain(
        dep: WidgetDependency,
        segment: string,
        isUuid: boolean,
        restSegments: string[],
        parentContext: MountRoutingContext,
        currentDepth: number
    ): Promise<void> {
        const mountId = dep.mount_id || dep.id;

        // For UUID segments, inherit parent routeParams and add the captured uuid value.
        // Named segments inherit parent routeParams without adding a new key.
        const childContext: MountRoutingContext = {
            behavior: parentContext.behavior,
            anchorSegment: isUuid ? segment : (dep.path ?? segment),
            anchorDepth: currentDepth,
            ...(isUuid
                ? { routeParams: { ...(parentContext.routeParams ?? {}), uuid: segment } }
                : (Object.keys(parentContext.routeParams ?? {}).length > 0
                    ? { routeParams: { ...parentContext.routeParams } }
                    : {})),
        };

        // Compute an explicit path from the full current URL so that chains which
        // use virtual (non-primary) section mounts still produce the correct
        // activePath and browser-history URL, even when anchorDepth jumps by >1.
        // e.g. /administrator/users/{user_uuid}/sites/{site_uuid} is preserved
        //      when the site dashboard loads into primary via an intermediate
        //      phantom mount for the 'sites' section.
        const explicitPath = this.buildRoutePath(childContext);

        // Load the dep into the appropriate mount point.
        // skipSlotResolution=true — resolveUriChain handles further recursion itself.
        await this.loadComponentById(dep.id, {
            mountId,
            pushHistory: false,
            transitionType: 'none',
            routingContext: childContext,
            skipSlotResolution: true,
            path: explicitPath,
        });

        // Hook 5: for named (non-UUID) segment deps, seed the breadcrumb label
        // from the dep manifest so it is available when the user later navigates
        // forward from this component (e.g. 'sites' → 'Sites').
        if (!isUuid) {
            const depManifest = this.manifestRegistry.get(dep.id);
            if (depManifest?.breadcrumbLabel) {
                this.uriLabelCache.set(segment, depManifest.breadcrumbLabel);
            }
        }

        // Recurse if there are more segments
        if (restSegments.length > 0) {
            const depManifest = this.manifestRegistry.get(dep.id);
            const mountedEl = this.mountRegistry.get(mountId)
                ?.activeWidgetElement as MountedWidgetElement | null;

            if (depManifest && mountedEl) {
                await this.resolveUriChain(
                    restSegments,
                    depManifest,
                    mountedEl,
                    childContext,
                    currentDepth + 1
                );
            }
        } else {
            // No more segments — allow slot deps of the mounted component to resolve
            // their own "/" default now that the element is in the DOM.
            const depManifest = this.manifestRegistry.get(dep.id);
            const mountedEl = this.mountRegistry.get(mountId)
                ?.activeWidgetElement as MountedWidgetElement | null;
            if (depManifest && mountedEl) {
                await this.mountSlotDependencies(depManifest, mountedEl, childContext);
            }
        }
    }

    /**
     * Load a widget directly into a <dyn-mount> that lives in the *parent*
     * component's template (parent-slot pattern).
     *
     * @param widgetId       The component id to load into the parent mount
     * @param parentMountId  The <dyn-mount id="..."> in the parent template
     * @param parentElement  The mounted parent widget element to search within
     * @param routingContext The fully-built routing context for the component being loaded
     */
    private async mountDepIntoParentSlot(
        widgetId: string,
        parentMountId: string,
        parentElement: MountedWidgetElement,
        routingContext: MountRoutingContext
    ): Promise<void> {
        const searchRoot: HTMLElement | ShadowRoot =
            parentElement.shadowRoot ?? parentElement;

        const dynMountSelector = 'dyn-mount';
        const dynMountEl = searchRoot.querySelector(
            `${dynMountSelector}[id="${parentMountId}"]`
        ) as HTMLElement | null;

        if (!dynMountEl) {
            console.warn(
                `DynComponentManager.mountDepIntoParentSlot: ` +
                `<dyn-mount id="${parentMountId}"> not found in parent "${parentElement.tagName}".`
            );
            return;
        }

        if (!this.mountRegistry.has(parentMountId)) {
            this.createMountPoint(parentMountId, null, undefined, dynMountEl);
        }

        // routingContext is already the fully-built child routing context from the
        // caller — it contains routeParams (uuid, int etc). Do NOT rebuild it here.
        await this.loadComponentById(widgetId, {
            mountId: parentMountId,
            pushHistory: false,
            transitionType: 'none',
            routingContext: routingContext,
            skipSlotResolution: true,
        });
    }

    /**
     * After a component is mounted, handle all type:"slot" dependencies by:
     * 1. Grouping slot deps by mount_id (multiple deps can share one mount point —
     *    each with a different path and/or widget id, swapped via transitions)
     * 2. Locating the <dyn-mount id="..."> for each unique mount_id in the template
     * 3. Registering each found element as a named mount point
     * 4. Resolving which dep is active for the current URL and loading it
     */
    private async mountSlotDependencies(
        manifest: WidgetManifest,
        parentElement: MountedWidgetElement,
        parentContext: MountRoutingContext | null = null
    ): Promise<void> {
        const slotDeps = (manifest.dependencies || []).filter(
            (dep) => dep.type === 'slot'
        );

        if (!slotDeps.length) return;

        const searchRoot: HTMLElement | ShadowRoot =
            parentElement.shadowRoot ?? parentElement;
        const dynMountSelector = 'dyn-mount';

        // Group deps by mount_id so we handle each physical mount point once.
        const depsByMountId = new Map<string, WidgetDependency[]>();
        for (const dep of slotDeps) {
            const mountId = dep.mount_id || dep.id;
            if (!depsByMountId.has(mountId)) {
                depsByMountId.set(mountId, []);
            }
            depsByMountId.get(mountId)!.push(dep);
        }

        console.debug(
            `[mountSlotDependencies] manifest="${manifest.id}" currentPath="${this.currentPath}"`,
            {
                parentContext,
                groups: Array.from(depsByMountId.entries()).map(([mountId, deps]) => ({
                    mountId,
                    deps: deps.map(d => ({ id: d.id, path: d.path })),
                })),
            }
        );

        for (const [mountId, depsForMount] of depsByMountId.entries()) {
            // Locate the <dyn-mount> element in the widget's render output
            const dynMountEl = searchRoot.querySelector(
                `${dynMountSelector}[id="${mountId}"]`
            ) as HTMLElement | null;

            if (!dynMountEl) {
                console.warn(
                    `DynComponentManager: no <dyn-mount id="${mountId}"> found in widget "${manifest.id}". ` +
                    `${depsForMount.length} slot dep(s) will not be mounted.`
                );
                continue;
            }

            // Register the physical mount point (only once per mount_id)
            const slotMountRecord = this.createMountPoint(mountId, depsForMount[0].path ?? null, undefined, dynMountEl);

            // Seed activePath with the parent's full path so that any component
            // loaded into this mount — and its children — can derive correct URLs
            // even when pushHistory is false and the browser bar hasn't been updated.
            if (slotMountRecord.activePath === null) {
                slotMountRecord.activePath = parentContext
                    ? this.buildRoutePath(parentContext)
                    : this.currentPath;
            }

            // Resolve which dep in this mount group is active for the current URL
            const activeDep = this.resolveActiveSlotDep(depsForMount, parentContext);

            console.debug(
                `[mountSlotDependencies] mountId="${mountId}" activeDep=`,
                activeDep ? { id: activeDep.id, path: activeDep.path } : null
            );

            if (!activeDep) continue;

            const childContext = this.buildChildRoutingContext(activeDep, parentContext);

            await this.loadComponentById(activeDep.id, {
                mountId,
                pushHistory: false,
                transitionType: 'none',
                routingContext: childContext,
            });

            // Seed breadcrumb label for named (non-wildcard, non-default) slot deps
            // so the cache is populated before the user navigates forward from here.
            const depPath = (activeDep.path ?? '/').replace(/^\/+/, '');
            if (depPath && depPath !== '/' && !depPath.startsWith('{')) {
                const depManifest = this.manifestRegistry.get(activeDep.id);
                if (depManifest?.breadcrumbLabel) {
                    this.uriLabelCache.set(depPath, depManifest.breadcrumbLabel);
                }
            }
        }
    }

    /**
     * Determine which slot dependency should be active given the parent's routing
     * context and the current URL path.
     *
     * The segment at parentContext.anchorDepth + 1 is compared against each dep's
     * `path` value. A dep with path "/" is the default (matches when no further
     * segment exists). More specific paths take precedence over "/".
     */
    private resolveActiveSlotDep(
        slotDeps: WidgetDependency[],
        parentContext: MountRoutingContext | null
    ): WidgetDependency | null {
        const segments = this.getPathSegments();

        // The child segment lives one level below the parent's anchor
        const childDepth = parentContext ? parentContext.anchorDepth + 1 : 1;
        const childSegment = segments[childDepth] ?? null;

        const sorted = [...slotDeps].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );

        // First pass — wildcard match ({uuid} or {int})
        if (childSegment) {
            const wildcardPattern = this.getWildcardPattern(childSegment);
            if (wildcardPattern) {
                const wildDep = sorted.find(d => {
                    const p = (d.path ?? '').replace(/^\/+/, '');
                    return p === `{${wildcardPattern}}`;
                });
                if (wildDep) return wildDep;
            }
        }

        // Second pass — exact named segment match
        if (childSegment) {
            const exact = sorted.find((dep) => {
                const p = (dep.path ?? '').replace(/^\/+/, '');
                return p !== '' && p !== '{uuid}' && p !== '{int}' && p === childSegment;
            });
            if (exact) return exact;
        }

        // Final pass — fall back to the default route "/"
        return sorted.find((dep) => {
            const p = (dep.path ?? '').replace(/^\/+/, '');
            return p === '' || p === '/';
        }) ?? sorted[0] ?? null;
    }

    /**
     * Build the routing context that should be handed to a slot dependency when
     * it is mounted. The child inherits the parent's behavior type and its
     * anchorDepth is incremented by one.
     */
    private buildChildRoutingContext(
        dep: WidgetDependency,
        parentContext: MountRoutingContext | null
    ): MountRoutingContext {
        const parentDepth = parentContext?.anchorDepth ?? 0;
        const segments = this.getPathSegments();
        const childDepth = parentDepth + 1;
        const rawSegment = segments[childDepth]
            ?? ((dep.path ?? '/').replace(/^\/+/, '') || '/');

        // Detect the wildcard pattern this dep uses (if any)
        const depPath = (dep.path ?? '').replace(/^\/+/, '');
        const isWildcardDep = depPath === '{uuid}' || depPath === '{int}';
        const wildcardKey = depPath === '{uuid}' ? 'uuid'
            : depPath === '{int}' ? 'int'
            : null;

        // Inherit parent routeParams and add the new wildcard value if applicable
        const parentParams = parentContext?.routeParams ?? {};
        const routeParams: Record<string, string> = {
            ...parentParams,
            ...(wildcardKey && this.getWildcardPattern(rawSegment) === wildcardKey
                ? { [wildcardKey]: rawSegment }
                : {}),
        };

        return {
            behavior: parentContext?.behavior ?? 'route',
            // For wildcard deps the anchor segment stays as the pattern literal
            // so depth-based logic stays stable; the real value is in routeParams
            anchorSegment: isWildcardDep ? depPath : rawSegment,
            anchorDepth: childDepth,
            ...(Object.keys(routeParams).length > 0 ? { routeParams } : {}),
        };
    }

    /** Return the URL path split into non-empty segments (zero-indexed). */
    private getPathSegments(): string[] {
        return this.currentPath
            .replace(/^\/+|\/+$/g, '')
            .split('/')
            .filter(Boolean);
    }

    /**
     * Build an absolute URL path from a route routing context.
     * Reconstructs the full path up to and including the component's anchor segment.
     */
    private buildRoutePath(context: MountRoutingContext): string {
        const segments = this.getPathSegments();
        const newSegments = segments.slice(0, context.anchorDepth);
        // anchorSegment "/" means "default at this depth" — the component lives at
        // the parent's URL, not at a new sub-path.  Appending it would produce
        // a double slash (e.g. /account/sites//).
        if (context.anchorSegment !== '/') {
            // anchorSegment is intentionally kept as the pattern literal (e.g.
            // "{uuid}") by buildChildRoutingContext so that depth-based logic
            // remains stable.  When building an actual URL we must resolve it to
            // the real value: prefer routeParams, then the live URL segment at
            // this depth, and only fall back to the literal if nothing else is
            // available (e.g. a named segment like "sites").
            const wildcardMatch = context.anchorSegment.match(/^\{(\w+)\}$/);
            if (wildcardMatch) {
                const key = wildcardMatch[1];
                const resolved = context.routeParams?.[key]
                    ?? segments[context.anchorDepth];
                newSegments.push(resolved ?? context.anchorSegment);
            } else {
                newSegments.push(context.anchorSegment);
            }
        }
        return '/' + newSegments.join('/');
    }

    /**
     * Build a URL that appends a modal query param to the current path.
     */
    private buildModalUrl(context: MountRoutingContext): string {
        if (!context.modalParam) return this.currentPath;
        const base = this.currentPath.split('?')[0];
        const existingParams = new URLSearchParams(this.queryString);
        existingParams.set(context.modalParam, context.modalValue ?? '');
        return `${base}?${existingParams.toString()}`;
    }

    /**
     * Navigate to a path relative to the active mount's anchor.
     * Finds the slot dep whose `path` matches the given segment and mounts it.
     * Called from the widget runtime as this.runtime.navigateTo('customers').
     */
    async navigateTo(
        targetPath: string,
        options: Omit<LoadComponentOptions, 'path'> = {}
    ): Promise<void> {
        const mountId = options.mountId ?? PRIMARY_MOUNT_ID;
        const mountRecord = this.mountRegistry.get(mountId);

        if (!mountRecord || !mountRecord.activeManifestId) {
            console.warn(`DynComponentManager.navigateTo: no active component on mount "${mountId}".`);
            return;
        }

        const activeManifest = this.manifestRegistry.get(mountRecord.activeManifestId);
        if (!activeManifest) return;

        const slotDeps = (activeManifest.dependencies || []).filter(d => d.type === 'slot');
        const normalizedTarget = targetPath.replace(/^\/+/, '') || '/';

        // Find the dep whose path matches the target — deps may share a mount_id,
        // so we match on path and then use that dep's mount_id as the load target.
        const matchedDep = slotDeps.find((dep) => {
            const p = (dep.path ?? '/').replace(/^\/+/, '') || '/';
            return p === normalizedTarget;
        });

        if (!matchedDep) {
            console.warn(
                `DynComponentManager.navigateTo: no slot dep with path "${targetPath}" ` +
                `found in manifest "${mountRecord.activeManifestId}".`
            );
            return;
        }

        const parentContext = mountRecord.routingContext;
        const childContext = this.buildChildRoutingContext(matchedDep, parentContext);
        const slotMountId = matchedDep.mount_id || matchedDep.id;

        await this.loadComponentById(matchedDep.id, {
            ...options,
            mountId: slotMountId,
            routingContext: childContext,
            transitionType: options.transitionType ?? 'none',
        });
    }

    private async createWidgetElement(
        manifest: WidgetManifest,
        props: Record<string, unknown> = {},
        routingContext: MountRoutingContext | null = null,
        mountId: string = PRIMARY_MOUNT_ID
    ): Promise<MountedWidgetElement> {
        const element = document.createElement(manifest.el_name) as MountedWidgetElement;

        element.setAttribute('data-widget-id', manifest.id);
        element.setAttribute('data-widget-version', manifest.version);
        if (routingContext) {
            element.setAttribute('data-dyn-anchor', routingContext.anchorSegment);
            element.setAttribute('data-dyn-depth', String(routingContext.anchorDepth));
            element.setAttribute('data-dyn-behavior', routingContext.behavior);
        }

        element.__dyn_manifest_id__ = manifest.id;
        element.__maxr_manifest_id__ = manifest.id;
        element.__dyn_component_props__ = props;
        element.__maxr_component_props__ = props;
        element.renderMode = manifest.renderMode;

        // Pass routing context so components can read route params via
        // this.getRouteParam('uuid') / this.getRouteParam('int')
        if (routingContext) {
            element.routingContext = routingContext;
        }

        element.runtime = {
            getAccessToken: () => this.getAccessToken(),
            setAccessToken: (token: string, tokenType?: string) =>
                this.setAccessToken(token, { tokenType, emitEvent: true }),
            apiFetch: this.apiFetch.bind(this),
            getAppIdentity: () => this.getAppIdentity(),
            loginEndpoint: this.loginEndpoint,
            // Default to this element's own mount so a widget always navigates
            // within itself unless the caller explicitly overrides mountId.
            loadComponentById: (widgetId: string, options?: LoadComponentOptions) =>
                this.loadComponentById(widgetId, { mountId, ...options }),
            // Explicit cross-mount navigation — caller provides the target mountId.
            loadComponentOnMount: (widgetId: string, targetMountId: string, options?: LoadComponentOptions) =>
                this.loadComponentById(widgetId, { ...options, mountId: targetMountId }),
            navigateBack: (overrideMountId?: string) => this.navigateBack(overrideMountId ?? mountId),
            getActiveMountRecord: (overrideMountId?: string) =>
                this.getMountRecord(overrideMountId ?? mountId),
            navigateTo: (targetPath: string, options?: Omit<LoadComponentOptions, 'path'>) =>
                this.navigateTo(targetPath, { mountId, ...options }),
            // ── FloatShield ──────────────────────────────────────────────────
            showSpinner:        () => this.floatShield.showSpinner(),
            hideSpinner:        () => this.floatShield.hideSpinner(),
            openModal:          (widgetId: string, options?) =>
                this.floatShield.openModal(widgetId, options),
            openAnchoredModal:  (widgetId: string, anchorEl: Element, options?) =>
                this.floatShield.openAnchoredModal(widgetId, anchorEl, options),
            closeModal:         () => this.floatShield.closeModal(),
            // ── Event bus ────────────────────────────────────────────────────
            on:  (eventName: string, callback: EventListenerOrEventListenerObject) =>
                this.eventTarget.addEventListener(eventName, callback),
            off: (eventName: string, callback: EventListenerOrEventListenerObject) =>
                this.eventTarget.removeEventListener(eventName, callback),
            // ── Breadcrumb ───────────────────────────────────────────────────
            setBreadcrumbLabel: (label: string) =>
                this.setCurrentComponentBreadcrumbLabel(label, routingContext),
        };

        Object.assign(element, props);

        return element;
    }

    private async mountInlineDependenciesForParent(
        parentElement: MountedWidgetElement,
        parentManifest: WidgetManifest,
        parentProps: Record<string, unknown> = {}
    ): Promise<void> {
        const root = parentElement.shadowRoot || parentElement;

        if (!root) return;

        // Use a variable so static selector analysers don't flag the custom element name.
        const dynSlotSelector = 'dyn-slot';
        const slotElements = Array.from(root.querySelectorAll(dynSlotSelector)) as HTMLElement[];

        if (!slotElements.length) return;

        const allDependencies = parentManifest.dependencies || [];

        const inlineDependencies = allDependencies
            .filter((dependency) => (dependency.type || 'inline') === 'inline')
            .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));

        for (const dependency of inlineDependencies) {
            const dependencyManifest = this.getManifestFromRegistry(dependency.id);

            if (!dependencyManifest) {
                if (dependency.required) {
                    throw new Error(
                        `Inline dependency manifest ${dependency.id} was not found in registry for parent ${parentManifest.id}.`
                    );
                }
                continue;
            }

            const matchedSlot = this.findMatchingDynSlot(slotElements, dependency, dependencyManifest);

            if (!matchedSlot) {
                if (dependency.required) {
                    throw new Error(
                        `No <dyn-slot> match was found for dependency ${dependency.id} in parent ${parentManifest.id}.`
                    );
                }
                continue;
            }

            await this.mountDependencyIntoSlot(
                matchedSlot,
                dependency,
                dependencyManifest,
                parentManifest,
                parentProps
            );
        }
    }

    private findMatchingDynSlot(
        slotElements: HTMLElement[],
        _dependency: WidgetDependency,
        dependencyManifest: WidgetManifest
    ): HTMLElement | null {
        const byComponentId = slotElements.find((slotElement) => {
            const componentId = slotElement.getAttribute('component_id');
            return !!componentId && componentId.trim() === _dependency.id;
        });

        if (byComponentId) return byComponentId;

        const slotMatchName = dependencyManifest.el_name;
        if (!slotMatchName) return null;

        const byName = slotElements.find((slotElement) => {
            const name = slotElement.getAttribute('name');
            return !!name && name.trim() === slotMatchName;
        });

        return byName || null;
    }

    private async mountDependencyIntoSlot(
        slotElement: HTMLElement,
        _dependency: WidgetDependency,
        dependencyManifest: WidgetManifest,
        parentManifest: WidgetManifest,
        parentProps: Record<string, unknown> = {}
    ): Promise<void> {
        if (slotElement.hasAttribute('data-dyn-mounted')) return;

        const childProps = {
            parentManifestId: parentManifest.id,
            parentWidgetId: parentManifest.id,
            slotName: slotElement.getAttribute('name') || null,
            ...parentProps,
        };

        const childElement = await this.createWidgetElement(dependencyManifest, childProps);

        childElement.__dyn_parent_manifest_id__ = parentManifest.id;
        childElement.__dyn_slot_name__ = slotElement.getAttribute('name');
        childElement.__maxr_parent_manifest_id__ = parentManifest.id;
        childElement.__maxr_slot_name__ = slotElement.getAttribute('name');

        slotElement.innerHTML = '';
        slotElement.appendChild(childElement);
        slotElement.setAttribute('data-dyn-mounted', 'true');
        slotElement.setAttribute('data-maxr-mounted', 'true'); // legacy compat
        slotElement.setAttribute('data-dyn-widget-id', dependencyManifest.id);
        slotElement.setAttribute('data-maxr-widget-id', dependencyManifest.id); // legacy compat

        await this.waitForElementRender(childElement);
    }

    // -------------------------------------------------------------------------
    // Shell rendering
    // -------------------------------------------------------------------------

    renderInitialShell(): void {
        this.rootElement.innerHTML = '';

        const record = this.createMountPoint(PRIMARY_MOUNT_ID, this.currentPath);
        record.mountElement.style.position = 'relative';
        record.mountElement.style.overflow = 'hidden';

        this.rootElement.appendChild(record.mountElement);

        // Initialise the global overlay system — appends its own <div> to <body>
        this.floatShield = new FloatShield(
            (widgetId, mountId, options) =>
                this.loadComponentById(widgetId, { mountId, ...options }),
            (mountId) => this.destroyMount(mountId)
        );
    }

    /**
     * Fully tear down a named mount point:
     * removes the active widget element from the DOM, then clears both
     * the mount registry and the routing-context registry.
     */
    private destroyMount(mountId: string): void {
        const record = this.mountRegistry.get(mountId);
        if (!record) return;
        if (record.activeWidgetElement?.parentElement) {
            record.activeWidgetElement.parentElement.removeChild(
                record.activeWidgetElement
            );
        }
        this.mountRegistry.delete(mountId);
        this.routingContextRegistry.delete(mountId);
    }

    renderErrorState(message: string): void {
        const primaryRecord = this.mountRegistry.get(PRIMARY_MOUNT_ID);
        const target = primaryRecord ? primaryRecord.mountElement : this.rootElement;

        target.innerHTML = `
            <div class="alert alert-danger" role="alert">
                ${this.escapeHtml(message)}
            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // Session / auth
    // -------------------------------------------------------------------------

    async fetchSessionTokenIfNeeded(): Promise<void> {
        if (this.accessToken && this.tokenPayload && !this.isTokenExpired()) {
            return;
        }

        this.hydrateAccessTokenFromStorage();

        if (this.accessToken && this.tokenPayload && !this.isTokenExpired()) {
            return;
        }

        const response = await fetch(this.sessionEndpoint, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error(`Session token request failed with status ${response.status}.`);
        }

        const payload: any = await response.json();

        if (!payload || payload.success !== true || !payload.data || !payload.data.access_token) {
            throw new Error('Session token response was invalid.');
        }

        this.setAccessToken(payload.data.access_token, {
            tokenType: payload.data.token_type || 'session',
            emitEvent: true,
        });
    }

    // -------------------------------------------------------------------------
    // Registry helpers
    // -------------------------------------------------------------------------

    private registerManifest(manifest: WidgetManifest): void {
        this.manifestRegistry.set(manifest.id, manifest);
    }

    private registerModule(id: string, module: LoadedWidgetModule): void {
        this.moduleRegistry.set(id, module);
    }

    private registerDependencyGraph(id: string, dependencies: WidgetManifest[]): void {
        this.dependencyRegistry.set(id, dependencies);
    }

    getManifestFromRegistry(id: string): WidgetManifest | null {
        return this.manifestRegistry.get(id) || null;
    }

    // noinspection JSUnusedGlobalSymbols
    getModuleFromRegistry(id: string): LoadedWidgetModule | null {
        return this.moduleRegistry.get(id) || null;
    }

    // noinspection JSUnusedGlobalSymbols
    getDependenciesFromRegistry(id: string): WidgetManifest[] {
        return this.dependencyRegistry.get(id) || [];
    }

    // -------------------------------------------------------------------------
    // Module / asset loading
    // -------------------------------------------------------------------------

    private async importModuleFromEntry(entry: string): Promise<LoadedWidgetModule> {
        if (!entry) {
            throw new Error('Widget manifest entry is missing or invalid.');
        }

        if (this.loadedScriptEntries.has(entry)) {
            return (this.moduleRegistry.get(entry) || await import(/* @vite-ignore */ entry)) as LoadedWidgetModule;
        }

        this.loadedScriptEntries.add(entry);
        return (await import(/* @vite-ignore */ entry)) as LoadedWidgetModule;
    }

    private async runDefineExportIfPresent(
        module: LoadedWidgetModule,
        manifest: WidgetManifest
    ): Promise<void> {
        const defineExportName = manifest.exports?.define;

        if (!defineExportName) return;

        const defineExport = module[defineExportName];

        if (typeof defineExport !== 'function') {
            throw new Error(
                `Manifest for ${manifest.id} declared define export "${defineExportName}" but it was not found.`
            );
        }

        await defineExport();
    }

    private installStylesheet(href: string): void {
        if (this.loadedStyleEntries.has(href)) return;

        const existing = document.querySelector(
            `link[data-dyn-href="${this.escapeAttribute(href)}"]`
        );
        if (existing) {
            this.loadedStyleEntries.add(href);
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-dyn-href', href);
        document.head.appendChild(link);

        this.loadedStyleEntries.add(href);
    }

    private async waitForElementRender(element: HTMLElement): Promise<void> {
        const maybeUpdateComplete = (
            element as HTMLElement & { updateComplete?: Promise<unknown> }
        ).updateComplete;

        if (maybeUpdateComplete && typeof maybeUpdateComplete.then === 'function') {
            await maybeUpdateComplete;
            return;
        }

        await Promise.resolve();
        await Promise.resolve();
    }

    // -------------------------------------------------------------------------
    // Auth helpers
    // -------------------------------------------------------------------------

    private extractAppIdentityFromPayload(payload: JwtPayload | null): AppIdentity | null {
        const app = payload?.data?.app;

        if (!app || typeof app !== 'object') return null;

        if (
            (app.type !== 'whitelabel' && app.type !== 'site') ||
            typeof app.name !== 'string' ||
            typeof app.domain !== 'string' ||
            typeof app.domain_ssl !== 'boolean' ||
            typeof app.uuid !== 'string'
        ) {
            return null;
        }

        return {
            type: app.type,
            name: app.name,
            domain: app.domain,
            domain_ssl: app.domain_ssl,
            portal_name: typeof app.portal_name === 'string' ? app.portal_name : null,
            portal_domain: typeof app.portal_domain === 'string' ? app.portal_domain : null,
            portal_domain_ssl:
                typeof app.portal_domain_ssl === 'boolean' ? app.portal_domain_ssl : null,
            uuid: app.uuid,
        };
    }

    getAppIdentity(): AppIdentity | null {
        return this.appIdentity;
    }

    private hydrateAccessTokenFromStorage(): void {
        const storedToken = window.localStorage.getItem(this.accessTokenStorageKey);

        if (!storedToken) return;

        try {
            const payload = this.decodeJwtPayload(storedToken);

            this.accessToken = storedToken;
            this.tokenPayload = payload;
            this.tokenType = typeof payload.token_type === 'string' ? payload.token_type : null;
            this.appIdentity = this.extractAppIdentityFromPayload(payload);

            if (this.isTokenExpired()) {
                this.clearAccessToken({ emitEvent: false });
            }
        } catch {
            this.clearAccessToken({ emitEvent: false });
        }
    }

    setAccessToken(
        accessToken: string,
        { tokenType = null, emitEvent = true }: SetAccessTokenOptions = {}
    ): void {
        if (!accessToken) {
            throw new Error('setAccessToken requires a valid JWT string.');
        }

        const jwtPayload = this.decodeJwtPayload(accessToken);

        this.accessToken = accessToken;
        this.tokenPayload = jwtPayload;
        this.tokenType = tokenType || (jwtPayload.token_type as string) || null;
        this.appIdentity = this.extractAppIdentityFromPayload(jwtPayload);

        window.localStorage.setItem(this.accessTokenStorageKey, accessToken);

        if (emitEvent) {
            this.dispatch('auth:token-updated', this.getAuthContext());
        }
    }

    clearAccessToken({ emitEvent = true }: ClearAccessTokenOptions = {}): void {
        this.accessToken = null;
        this.tokenPayload = null;
        this.tokenType = null;
        this.appIdentity = null;

        window.localStorage.removeItem(this.accessTokenStorageKey);

        if (emitEvent) {
            this.dispatch('auth:token-cleared', this.getAuthContext());
        }
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    // noinspection JSUnusedGlobalSymbols
    getTokenPayload(): JwtPayload | null {
        return this.tokenPayload;
    }

    getTokenType(): TokenType {
        return this.tokenType;
    }

    isTokenExpired(): boolean {
        if (!this.tokenPayload || typeof this.tokenPayload.exp !== 'number') return false;
        return Math.floor(Date.now() / 1000) >= this.tokenPayload.exp;
    }

    getAuthContext(): AuthContext {
        return {
            accessToken: this.accessToken,
            tokenType: this.tokenType,
            tokenPayload: this.tokenPayload,
            isAuthenticated: !!this.accessToken,
            isExpired: this.isTokenExpired(),
            appIdentity: this.appIdentity,
        };
    }

    getAuthorizedHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            ...extraHeaders,
        };

        if (this.accessToken) {
            headers.Authorization = `Bearer ${this.accessToken}`;
        }

        return headers;
    }

    async apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
        const method = options.method || 'GET';
        const headers = this.getAuthorizedHeaders(options.headers || {});
        const body = options.body;

        return fetch(url, {
            ...options,
            method,
            headers,
            body,
            credentials: 'same-origin',
        });
    }

    decodeJwtPayload(jwt: string): JwtPayload {
        const parts = jwt.split('.');

        if (parts.length !== 3) {
            throw new Error('Invalid JWT format.');
        }

        const base64Url = parts[1];
        const base64 = base64Url
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(Math.ceil(base64Url.length / 4) * 4, '=');

        return JSON.parse(atob(base64)) as JwtPayload;
    }

    // -------------------------------------------------------------------------
    // Event bus
    // -------------------------------------------------------------------------

    // noinspection JSUnusedGlobalSymbols
    on(eventName: string, callback: EventListenerOrEventListenerObject): void {
        this.eventTarget.addEventListener(eventName, callback);
    }

    // noinspection JSUnusedGlobalSymbols
    off(eventName: string, callback: EventListenerOrEventListenerObject): void {
        this.eventTarget.removeEventListener(eventName, callback);
    }

    dispatch(eventName: string, detail: unknown = {}): void {
        this.eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    /**
     * Walk the current path segments, look up each segment's display label from
     * uriLabelCache, and broadcast a 'breadcrumb:update' event with the resulting
     * BreadcrumbItem array.
     *
     * "Home" is always prepended as the first item.  Segments with no cached label
     * are silently skipped.  The last labelled segment is marked active (path: null);
     * all preceding labelled segments become clickable links.
     */
    private rebuildAndBroadcastCrumbs(): void {
        const segments = this.getPathSegments();
        const crumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];

        // Collect all labelled segments with their cumulative path.
        let builtPath = '';
        const labelled: Array<{ label: string; path: string }> = [];
        for (const seg of segments) {
            builtPath += '/' + seg;
            const label = this.uriLabelCache.get(seg) ?? null;
            if (label) {
                labelled.push({ label, path: builtPath });
            }
        }

        // All but the last become links; the last is the active (non-clickable) leaf.
        for (let i = 0; i < labelled.length; i++) {
            const isLast = i === labelled.length - 1;
            crumbs.push({
                label: labelled[i].label,
                path:  isLast ? null : labelled[i].path,
            });
        }

        this.dispatch('breadcrumb:update', crumbs);
    }

    /**
     * Update uriLabelCache for the URL segment that belongs to the given
     * routingContext, then re-broadcast the breadcrumb trail.
     *
     * Called via runtime.setBreadcrumbLabel() — widgets invoke this once they
     * have loaded the entity name (e.g. "John Doe" for a user dashboard).
     */
    private setCurrentComponentBreadcrumbLabel(
        label: string,
        routingContext: MountRoutingContext | null
    ): void {
        // Prefer the real UUID/int value from routeParams; fall back to the named
        // anchor segment (handles named-segment components like a sites list).
        const segment =
            routingContext?.routeParams?.uuid ??
            routingContext?.routeParams?.int  ??
            routingContext?.anchorSegment;

        // Never cache pattern literals — the real value must be the key.
        if (segment && segment !== '/' && !segment.startsWith('{')) {
            this.uriLabelCache.set(segment, label);
            this.rebuildAndBroadcastCrumbs();
        }
    }

    // -------------------------------------------------------------------------
    // Utility
    // -------------------------------------------------------------------------

    escapeHtml(value: unknown): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    escapeAttribute(value: string): string {
        return value.replace(/"/g, '&quot;');
    }

    /** Remove the popstate listener when the manager is no longer needed */
    // noinspection JSUnusedGlobalSymbols
    destroy(): void {
        window.removeEventListener('popstate', this.boundHandlePopState);
    }
}

