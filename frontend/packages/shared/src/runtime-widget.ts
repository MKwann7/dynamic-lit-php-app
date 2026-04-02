import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import type { WidgetRuntime, AppIdentity, MountRoutingContext } from './types';


interface JwtPayload {
    iss?: string;
    aud?: string;
    iat?: number;
    nbf?: number;
    exp?: number;
    token_type?: string;
    sub?: string;
    data?: Record<string, unknown>;
    [key: string]: unknown;
}

export abstract class RuntimeWidgetElement extends LitElement {
    @property({ attribute: false })
    runtime?: WidgetRuntime;

    @property({ attribute: false })
    renderMode?: string;

    /**
     * Routing context set by the DynComponentManager when this component is mounted.
     * Contains wildcard values extracted from the URL (e.g. uuid, int).
     * Read route params via getRouteParam('uuid') / getRouteParam('int').
     */
    @property({ attribute: false })
    routingContext?: MountRoutingContext;

    protected getAccessToken(): string | null {
        return this.runtime?.getAccessToken?.() || null;
    }

    protected override createRenderRoot(): HTMLElement | DocumentFragment {
        if (this.renderMode === 'light') {
            this._injectLightStyles();
            return this;
        }

        return super.createRenderRoot();
    }

    /**
     * Injects this component's `static styles` into <head> exactly once per
     * tag name.  Called automatically when `renderMode === 'light'`.
     *
     * Subclasses that render into the light DOM do NOT need to override
     * `createRenderRoot()` themselves — this method handles it.
     */
    protected _injectLightStyles(): void {
        if (document.head.querySelector(`[data-styles-for="${this.tagName.toLowerCase()}"]`)) {
            return;
        }
        const elementStyles: Array<{ cssText: string }> =
            (this.constructor as any).elementStyles ?? [];
        if (!elementStyles.length) {
            return;
        }
        const style = document.createElement('style');
        style.setAttribute('data-styles-for', this.tagName.toLowerCase());
        style.textContent = elementStyles.map(s => s.cssText).join('\n');
        document.head.appendChild(style);
    }

    protected getTokenPayload(): JwtPayload | null {
        const token = this.getAccessToken();

        if (!token) {
            return null;
        }

        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }

            const base64 = parts[1]
                .replace(/-/g, '+')
                .replace(/_/g, '/')
                .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

            return JSON.parse(atob(base64)) as JwtPayload;
        } catch {
            return null;
        }
    }

    protected isTokenExpired(payload: JwtPayload | null = this.getTokenPayload()): boolean {
        if (!payload?.exp) {
            return false;
        }

        return Math.floor(Date.now() / 1000) >= payload.exp;
    }

    protected getTokenType(): string | null {
        const payload = this.getTokenPayload();
        if (!payload || this.isTokenExpired(payload)) {
            return null;
        }

        return typeof payload.token_type === 'string' ? payload.token_type : null;
    }

    /**
     * Return the list of admin permission keys embedded in the JWT, or an
     * empty array if the user has none (i.e. is a regular 'user' token).
     *
     * Example values: 'sites.view_all', 'platform.settings.edit'
     */
    protected getAdminPermissions(): string[] {
        const payload = this.getTokenPayload();
        if (!payload || this.isTokenExpired(payload)) {
            return [];
        }

        const data = payload.data as Record<string, unknown> | undefined;
        const perms = data?.permissions;

        if (!Array.isArray(perms)) {
            return [];
        }

        return perms.filter((p): p is string => typeof p === 'string');
    }

    /**
     * Return true if the user's JWT contains the given admin permission key
     * and the token is not expired.
     *
     * Usage: this.hasAdminPermission('sites.edit_all')
     */
    protected hasAdminPermission(permission: string): boolean {
        return this.getAdminPermissions().includes(permission);
    }

    protected getAppIdentity(): AppIdentity | null {
        return this.runtime?.getAppIdentity?.() || null;
    }

    protected getAppType(): string | null {
        return this.getAppIdentity()?.type || null;
    }

    protected getAppName(): string | null {
        return this.getAppIdentity()?.name || null;
    }

    protected getAppDomain(): string | null {
        return this.getAppIdentity()?.domain || null;
    }

    protected isAppDomainSsl(): boolean {
        return !!this.getAppIdentity()?.domain_ssl;
    }

    protected getPortalName(): string | null {
        return this.getAppIdentity()?.portal_name || null;
    }

    protected getPortalDomain(): string | null {
        return this.getAppIdentity()?.portal_domain || null;
    }

    protected isPortalDomainSsl(): boolean {
        return !!this.getAppIdentity()?.portal_domain_ssl;
    }

    // -------------------------------------------------------------------------
    // Route parameter helpers
    // -------------------------------------------------------------------------

    /**
     * Return the full routing context for this component, or null if not set.
     */
    protected getRoutingContext(): MountRoutingContext | null {
        return this.routingContext ?? null;
    }

    /**
     * Return all route params extracted from the URL for this component.
     * e.g. { uuid: "bc07cd56-8a74-4aff-93de-9f4b4bc97faf" }
     *      { int: "42" }
     */
    protected getRouteParams(): Record<string, string> {
        return this.routingContext?.routeParams ?? {};
    }

    /**
     * Navigate back to the previous component in this mount.
     *
     * If the component was reached via user navigation the browser history stack
     * is popped (address bar updates, correct back animation fires automatically).
     * If the component was the entry point (fresh URL paste / bookmark) a
     * forward navigation to the owning component is performed with a right-slide
     * so it visually mirrors the reverse of the original transition.
     */
    protected navigateBack(): void {
        void this.runtime?.navigateBack();
    }

    /**
     * Return the route parameter helpers.
     *
     * For a dep with path "{uuid}":  getRouteParam('uuid')
     * For a dep with path "{int}":   getRouteParam('int')
     *
     * Returns null if the param is not present.
     */
    protected getRouteParam(key: string): string | null {
        return this.routingContext?.routeParams?.[key] ?? null;
    }
}