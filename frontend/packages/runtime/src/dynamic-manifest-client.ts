export type WidgetDependencyType = 'inline' | 'standalone' | 'slot' | 'parent-slot';

export interface WidgetDependency {
    id: string;
    alias?: string;
    required?: boolean;
    eager?: boolean;
    sortOrder?: number;
    type?: WidgetDependencyType;
    tag?: string | null;
    el_name?: string | null;
    /** The id of the <dyn-mount> element that hosts this dependency.
     *  For type:"slot" — lives in the component's own template.
     *  For type:"parent-slot" — lives in the *parent* component's template. */
    mount_id?: string | null;
    /** URI path segment that activates this dependency.
     *  Plain string: exact match (e.g. "/my-sites")
     *  "/":          default route — matches when no further segment exists
     *  "{uuid}":     wildcard — matches any UUID v4 segment
     *  "{int}":      wildcard — matches any positive integer segment
     */
    path?: string | null;
}

export interface WidgetExports {
    define?: string;
    mount?: string;
}

export interface WidgetManifest {
    id: string;
    name: string;
    tag: string;
    el_name: string;
    uri: string;
    version: string;
    framework: string;
    entry: string;
    cssPath?: string | null;
    integrity?: string | null;
    renderMode: string;
    themeAware: true;
    exposeParts: string[];
    dependencies: WidgetDependency[];
    exports: WidgetExports;
    manifestJson?: Record<string, unknown> | null;
    /**
     * Human-readable label for this component's URL segment, used to build
     * breadcrumb trails.  Present on section-shell manifests only.
     * e.g. "Home", "Users", "Sites".
     */
    breadcrumbLabel?: string | null;
}

export interface WidgetManifestFromApi {
    id: string;
    name: string;
    tag: string;
    el_name: string;
    uri: string;
    version: string;
    framework: string;
    entry: string;
    cssPath?: string | null;
    integrity?: string | null;
    render_mode: string;
    theme_aware: true;
    expose_parts: string[];
    dependencies: WidgetDependency[];
    exports: WidgetExports;
    manifestJson?: Record<string, unknown> | null;
    breadcrumb_label?: string | null;
}

export interface ResolveByUriResponse {
    route: {
        uri: string;
        isPublic?: boolean;
    };
    component?: {
        id: number;
        name?: string;
        tag?: string;
        el_name?: string;
        uri?: string;
        framework?: string;
    };
    version?: {
        id: number;
        version?: string;
        status?: string;
    };
    resolved: {
        rootWidgetId: string;
        manifestEndpoint?: string;
    };
}

export interface DynamicManifestClientOptions {
    resolveUriEndpoint?: string;
    manifestEndpointTemplate?: string;
    manifestByUriEndpoint?: string;
    defaultHeaders?: Record<string, string>;
    accessTokenProvider?: (() => string | null) | null;
}

interface ApiEnvelope<T> {
    success: boolean;
    data: T;
    message?: string;
}

export class DynamicManifestClient {
    private resolveUriEndpoint: string;
    private manifestEndpointTemplate: string;
    private manifestByUriEndpoint: string;
    private defaultHeaders: Record<string, string>;
    private accessTokenProvider: (() => string | null) | null;

    private resolveCache: Map<string, Promise<ResolveByUriResponse>>;
    private manifestCache: Map<string, Promise<WidgetManifest>>;
    private manifestByUriCache: Map<string, Promise<WidgetManifest>>;

    constructor({
                    resolveUriEndpoint = '/api/v1/components/resolve-by-uri',
                    manifestEndpointTemplate = '/api/v1/components/{id}/manifest',
                    manifestByUriEndpoint = '/api/v1/components/manifest-by-uri',
                    defaultHeaders = {},
                    accessTokenProvider = null,
                }: DynamicManifestClientOptions = {}) {
        this.resolveUriEndpoint = resolveUriEndpoint;
        this.manifestEndpointTemplate = manifestEndpointTemplate;
        this.manifestByUriEndpoint = manifestByUriEndpoint;
        this.defaultHeaders = defaultHeaders;
        this.accessTokenProvider = accessTokenProvider;

        this.resolveCache = new Map<string, Promise<ResolveByUriResponse>>();
        this.manifestCache = new Map<string, Promise<WidgetManifest>>();
        this.manifestByUriCache = new Map<string, Promise<WidgetManifest>>();
    }

    // noinspection JSUnusedGlobalSymbols
    async resolveByUri(uri: string): Promise<ResolveByUriResponse> {
        const normalizedUri = this.normalizeUri(uri);

        if (!this.resolveCache.has(normalizedUri)) {
            const promise = this.fetchResolveByUri(normalizedUri);
            promise.catch(() => this.resolveCache.delete(normalizedUri));
            this.resolveCache.set(normalizedUri, promise);
        }

        return this.resolveCache.get(normalizedUri) as Promise<ResolveByUriResponse>;
    }

    /**
     * Fetch a full WidgetManifest directly by URI in a single HTTP request.
     * Uses /api/v1/component/manifest-by-uri?uri=... which joins component_route
     * and component_version server-side, eliminating the resolve → manifest waterfall.
     */
    async getManifestByUri(uri: string): Promise<WidgetManifest | null> {
        const normalizedUri = this.normalizeUri(uri);

        if (!this.manifestByUriCache.has(normalizedUri)) {
            const promise = this.fetchManifestByUri(normalizedUri);
            promise.catch(() => this.manifestByUriCache.delete(normalizedUri));
            this.manifestByUriCache.set(normalizedUri, promise);
        }

        return this.manifestByUriCache.get(normalizedUri) as Promise<WidgetManifest | null>;
    }

    async getManifestById(id: string): Promise<WidgetManifest> {
        if (!id) {
            throw new Error('getManifestById requires a valid widget id.');
        }

        if (!this.manifestCache.has(id)) {
            this.manifestCache.set(id, this.fetchManifestById(id));
        }

        return this.manifestCache.get(id) as Promise<WidgetManifest>;
    }

    // noinspection JSUnusedGlobalSymbols
    async getManifestsByIds(ids: string[]): Promise<WidgetManifest[]> {
        const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
        return Promise.all(uniqueIds.map((id) => this.getManifestById(id)));
    }

    // noinspection JSUnusedGlobalSymbols
    clearResolveCache(uri?: string): void {
        if (uri) {
            this.resolveCache.delete(this.normalizeUri(uri));
            return;
        }

        this.resolveCache.clear();
    }

    // noinspection JSUnusedGlobalSymbols
    clearManifestCache(id?: string): void {
        if (id) {
            this.manifestCache.delete(id);
            return;
        }

        this.manifestCache.clear();
        this.manifestByUriCache.clear();
    }

    private async fetchManifestByUri(uri: string): Promise<WidgetManifest | null> {
        const url = `${this.manifestByUriEndpoint}?uri=${encodeURIComponent(uri)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: this.buildHeaders(),
            credentials: 'same-origin',
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Manifest-by-uri request failed with status ${response.status}.`);
        }

        const payload = await response.json() as ApiEnvelope<WidgetManifestFromApi>;

        if (!payload || !payload.success || !payload.data) {
            throw new Error(`Manifest-by-uri response for "${uri}" was invalid.`);
        }

        return this.normalizeManifest(payload.data);
    }

    private async fetchResolveByUri(uri: string): Promise<ResolveByUriResponse> {
        const url = this.buildResolveUrl(uri);
        const response = await fetch(url, {
            method: 'GET',
            headers: this.buildHeaders(),
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error(`Resolve-by-uri request failed with status ${response.status}.`);
        }

        const payload = await response.json() as ApiEnvelope<ResolveByUriResponse>;

        if (!payload || !payload.success || !payload.data) {
            throw new Error('Resolve-by-uri response was invalid.');
        }

        if (!payload.data.resolved?.rootWidgetId) {
            throw new Error('Resolve-by-uri response is missing resolved.rootWidgetId.');
        }

        return payload.data;
    }

    private async fetchManifestById(id: string): Promise<WidgetManifest> {
        const url = this.buildManifestUrl(id);
        const response = await fetch(url, {
            method: 'GET',
            headers: this.buildHeaders(),
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error(`Manifest request failed for widget ${id} with status ${response.status}.`);
        }

        const payload = await response.json() as ApiEnvelope<WidgetManifestFromApi>;

        if (!payload || !payload.success || !payload.data) {
            throw new Error(`Manifest response for widget ${id} was invalid.`);
        }

        return this.normalizeManifest(payload.data);
    }

    private normalizeManifest(manifest: WidgetManifestFromApi): WidgetManifest {
        return {
            id: manifest.id,
            name: manifest.name,
            tag: manifest.tag,
            el_name: manifest.el_name,
            uri: manifest.uri,
            version: manifest.version,
            framework: manifest.framework,
            entry: manifest.entry,
            cssPath: manifest.cssPath || null,
            integrity: manifest.integrity || null,
            renderMode: manifest.render_mode || 'light',
            themeAware: manifest.theme_aware || null,
            exposeParts: manifest.expose_parts || [],
            dependencies: Array.isArray(manifest.dependencies)
                ? manifest.dependencies.map((dependency) => ({
                    id: dependency.id,
                    alias: dependency.alias,
                    required: dependency.required,
                    eager: dependency.eager,
                    sortOrder: dependency.sortOrder,
                    type: dependency.type || 'inline',
                    tag: dependency.tag || null,
                    el_name: dependency.el_name || null,
                    mount_id: dependency.mount_id || null,
                    path: dependency.path || null,
                }))
                : [],
            exports: manifest.exports || {},
            manifestJson: manifest.manifestJson || null,
            breadcrumbLabel: manifest.breadcrumb_label ?? null,
        };
    }

    private buildResolveUrl(uri: string): string {
        const basePath = this.resolveUriEndpoint
        const separator = basePath.indexOf('?') >= 0 ? '&' : '?';
        return `${basePath}${separator}uri=${encodeURIComponent(uri)}`;
    }

    private buildManifestUrl(id: string): string {
        return this.manifestEndpointTemplate.replace('{id}', encodeURIComponent(id));
    }

    private buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            ...this.defaultHeaders,
        };

        if (this.accessTokenProvider) {
            const token = this.accessTokenProvider();
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }

        return headers;
    }

    private normalizeUri(uri: string): string {
        if (!uri) {
            return '/';
        }

        if (uri.charAt(0) !== '/') {
            return `/${uri}`;
        }

        return uri;
    }
}