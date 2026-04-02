export type AppIdentityType = 'whitelabel' | 'site';

/**
 * A single item in the header breadcrumb trail.
 * `path === null` means this is the active (non-clickable) leaf segment.
 */
export interface BreadcrumbItem {
    label: string;
    path: string | null;
}

export interface AppIdentity {
    type: AppIdentityType;
    name: string;
    domain: string;
    domain_ssl: boolean;
    portal_name?: string | null;
    portal_domain?: string | null;
    portal_domain_ssl?: boolean | null;
    uuid: string;
}

export type TransitionType = 'fade' | 'left' | 'right' | 'none';

/**
 * How a mounted component participates in URL management.
 *
 * route     — owns a path segment; pushes/replaces path via history.pushState
 * subroute  — appends a hash fragment to the current path
 * modal     — appends a query param (?modalParam=modalValue); does not alter the path
 * silent    — no URL involvement at all (inline sub-panels, chrome, tab content)
 */
export type MountBehavior = 'route' | 'subroute' | 'modal' | 'silent';

/**
 * Routing context supplied by the *caller* when mounting a component.
 * The component itself never declares this — it is always imposed from outside.
 *
 * anchorSegment — the URL segment this component "owns" (e.g. "account", "customers")
 * anchorDepth   — zero-based index of that segment in the full path
 * routeParams   — wildcard values extracted from the URL, keyed by their pattern name
 *                 e.g. { uuid: "bc07cd56-...", int: "42" }
 * modalParam    — query param key used when behavior === 'modal'
 * modalValue    — query param value used when behavior === 'modal'
 */
export interface MountRoutingContext {
    behavior: MountBehavior;
    anchorSegment: string;
    anchorDepth: number;
    routeParams?: Record<string, string>;
    modalParam?: string;
    modalValue?: string;
}

export interface LoadComponentOptions {
    transitionType?: TransitionType;
    transitionSpeed?: number;
    mountId?: string;
    pushHistory?: boolean;
    /** Explicit URL to push. If omitted, derived from routingContext.anchorSegment. */
    path?: string;
    /** Routing context imposed by the caller — component never declares this itself. */
    routingContext?: MountRoutingContext;
    /**
     * When true, suppresses the automatic mountSlotDependencies call inside
     * loadComponentById. Used by resolveUriChain which handles slot resolution
     * itself as part of the URI walk.
     */
    skipSlotResolution?: boolean;
    /**
     * Controls how mountRecord.history is updated during this load.
     *
     * 'push' (default for animated loads) — push the outgoing widget ID onto
     *         the mount's internal history stack so navigateBack() can detect
     *         that there is something to go back to.
     * 'pop'  — pop the last entry (used by handlePopState when the browser
     *         back button is pressed — the stack should shrink, not grow).
     * 'none' — leave the stack untouched (used by silent/setup loads such as
     *         slot resolution, where no user-visible navigation occurred).
     *
     * If omitted, defaults to 'none' when transitionType is 'none', and
     * 'push' for all other transitions.
     */
    historyOp?: 'push' | 'pop' | 'none';
    /**
     * When true, skips stamping __dyn_source_widget_id__ / __dyn_source_path__ /
     * __dyn_source_routing_context__ on the newly loaded element.
     *
     * Used by navigateBack() Case 2 (back-navigation after a fresh URL load) so
     * that the restored component does NOT set up another Case-2 chain pointing
     * back at the component we just left.  Without this, the next back-press from
     * the restored component would Case-2 its way back to the wrong screen
     * (e.g. user-dashboard → site-dashboard) instead of falling through to Case 3
     * (strip UUID → user-list).
     */
    skipSourceStamp?: boolean;
}

export interface MountRecord {
    id: string;
    mountElement: HTMLElement;
    activeWidgetElement: HTMLElement | null;
    activeManifestId: string | null;
    history: string[];
    path: string | null;
    /**
     * The full URL path of the component currently loaded into this mount,
     * kept up-to-date on every load even when pushHistory is false.
     * Child navigations use this as their base path instead of the global
     * this.currentPath, so multi-segment URLs like /account/sites/{uuid}
     * are built correctly even when the browser address bar only shows /account.
     */
    activePath: string | null;
    routingContext: MountRoutingContext | null;
}

/** Options forwarded when opening a floating modal component. */
export interface ModalOptions {
    routingContext?: MountRoutingContext;
    onClose?: () => void;
    /**
     * CSS max-width for the modal panel (e.g. "640px", "50vw").
     * The panel always shrinks to fit smaller viewports; this is the upper cap.
     * Defaults to the shell's global max (currently 90vw).
     */
    maxWidth?: string;
}

export type PopoverPlacement =
    | 'bottom-end'
    | 'bottom-start'
    | 'bottom'
    | 'top-end'
    | 'top-start'
    | 'top';

/** Options for an anchored (popover) overlay component. */
export interface AnchoredModalOptions {
    /** Where to place the panel relative to the anchor element. Default: bottom-end */
    placement?: PopoverPlacement;
    /** Gap in pixels between anchor edge and panel. Default: 8 */
    offset?: number;
    routingContext?: MountRoutingContext;
    onClose?: () => void;
}

export interface WidgetRuntime {
    getAccessToken(): string | null;
    setAccessToken(token: string, tokenType?: string): void;
    apiFetch(url: string, options?: RequestInit): Promise<Response>;
    getAppIdentity(): AppIdentity | null;
    loginEndpoint?: string;
    loadComponentById(widgetId: string, options?: LoadComponentOptions): Promise<void>;
    loadComponentOnMount(widgetId: string, mountId: string, options?: LoadComponentOptions): Promise<void>;
    navigateBack(mountId?: string): Promise<void>;
    getActiveMountRecord(mountId?: string): MountRecord | null;
    navigateTo(path: string, options?: Omit<LoadComponentOptions, 'path'>): Promise<void>;
    /** Show a full-screen CSS spinner overlay. */
    showSpinner(): void;
    /** Hide the spinner overlay. */
    hideSpinner(): void;
    /**
     * Open a full-screen centred modal hosting a dynamically loaded component.
     */
    openModal(widgetId: string, options?: ModalOptions): Promise<void>;
    /**
     * Open a popover panel anchored to a specific DOM element.
     * The panel is positioned automatically with a directional arrow.
     * Clicking outside or scrolling closes it.
     */
    openAnchoredModal(widgetId: string, anchorEl: Element, options?: AnchoredModalOptions): Promise<void>;
    /** Close the currently active overlay (modal or anchored popover). */
    closeModal(): void;
    /**
     * Register the human-readable label for this widget's URL segment so the
     * header breadcrumb trail reflects the real name (e.g. "John Doe" instead
     * of the UUID placeholder "…").
     *
     * Call once after your loadData() resolves with the name/title to display.
     * Only meaningful for UUID-anchored widgets (dashboards).  Named-segment
     * labels come from the manifest's breadcrumbLabel field instead.
     *
     * Example:
     *   this.runtime?.setBreadcrumbLabel('John Doe');
     *   this.runtime?.setBreadcrumbLabel(this.site?.site_name ?? 'Site');
     */
    setBreadcrumbLabel(label: string): void;
    /**
     * Subscribe to a manager-level event on the internal event bus.
     * Primary use-case: listen for 'breadcrumb:update' to receive BreadcrumbItem[].
     *
     * Example:
     *   this.runtime?.on('breadcrumb:update', this.onBreadcrumbUpdate);
     */
    on(eventName: string, callback: EventListenerOrEventListenerObject): void;
    /**
     * Unsubscribe from a manager-level event previously registered with on().
     */
    off(eventName: string, callback: EventListenerOrEventListenerObject): void;
}