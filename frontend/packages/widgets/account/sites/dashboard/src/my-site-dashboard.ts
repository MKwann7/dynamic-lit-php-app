import { css, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

// ── IDs of the three anchored-modal components ───────────────────────────────
const PROFILE_MANAGE_ID = 'cbd0cab1-1906-49b5-bbe3-ffdcb7e616d2';
const USER_MANAGE_ID    = 'e6cde524-13f5-4db2-86cf-d0304c07f420';
const THEME_SETTINGS_ID = '44f8672a-7897-4c74-a120-e2d6908ef5ea';

type DashTab = 'profile' | 'editor' | 'contacts' | 'billing';

interface SiteData {
    uuid:        string;
    site_num:    number | null;
    site_name:   string | null;
    domain:      string | null;
    vanity_url:  string | null;
    template:    string | null;
    owner_name:  string | null;
    status:      string | null;
    banner_url:  string | null;
    logo_url:    string | null;
    favicon_url: string | null;
}

interface SiteUser {
    username:     string | null;
    display_name: string | null;
    email:        string | null;
    phone:        string | null;
    avatar_url:   string | null;
    status:       string | null;
}

@customElement('maxr-my-site-dashboard')
export class MaxrSiteDashboard extends RuntimeWidgetElement {

    static styles = css`
        :host { display: block; background: #f0f2f5; min-height: 100%; }

        /* ── Header ──────────────────────────────────────────────────────── */
        .dash-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            background: #fff;
            border-bottom: 1px solid #dee2e6;
        }
        .back-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            background: #dc3545;
            border: none;
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.12s;
        }
        .back-btn:hover { background: #b02a37; }
        .back-btn svg { width: 16px; height: 16px; fill: #fff; }
        .dash-title {
            font-size: 1rem;
            font-weight: 700;
            color: #212529;
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .tab-group { display: flex; gap: 4px; flex-wrap: wrap; }
        .tab-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 12px;
            font-size: 0.82rem;
            font-weight: 500;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            background: #fff;
            color: #495057;
            cursor: pointer;
            white-space: nowrap;
            transition: background 0.12s, color 0.12s, border-color 0.12s;
        }
        .tab-btn svg { width: 14px; height: 14px; fill: currentColor; flex-shrink: 0; }
        .tab-btn:hover { background: #f0f2f5; }
        .tab-btn.active { background: #0d6efd; color: #fff; border-color: #0d6efd; }

        /* ── Body ────────────────────────────────────────────────────────── */
        .dash-body { padding: 16px; }
        .loading-state, .coming-soon {
            padding: 48px;
            text-align: center;
            color: #6c757d;
            font-size: 0.95rem;
        }

        /* ── 2-col card grid ─────────────────────────────────────────────── */
        .card-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        /* ── Base card ───────────────────────────────────────────────────── */
        .card {
            background: #fff;
            border: 1px solid #e0e4ea;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .card-hd {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 11px 14px;
            border-bottom: 1px solid #f0f2f5;
        }
        .card-hd .hd-icon { width: 20px; height: 20px; fill: #495057; flex-shrink: 0; }
        .card-title { font-size: 0.95rem; font-weight: 700; color: #212529; flex: 1; }
        .check-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #198754;
            flex-shrink: 0;
        }
        .check-badge svg { width: 12px; height: 12px; fill: #fff; }
        .edit-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #198754;
            border: none;
            cursor: pointer;
            flex-shrink: 0;
            padding: 0;
            transition: background 0.12s;
        }
        .edit-btn:hover { background: #146c43; }
        .edit-btn svg { width: 13px; height: 13px; fill: #fff; }

        /* ── Site Info card ──────────────────────────────────────────────── */
        .info-body { padding: 4px 0 8px; }
        .info-row {
            display: grid;
            grid-template-columns: 38% 1fr;
            padding: 6px 14px;
            font-size: 0.875rem;
            align-items: baseline;
        }
        .info-row.highlight { background: #0d6efd; }
        .info-label { color: #6c757d; }
        .info-row.highlight .info-label { color: rgba(255,255,255,0.85); }
        .info-value { font-weight: 700; color: #212529; }
        .info-row.highlight .info-value { color: #fff; }

        /* ── Site User card ──────────────────────────────────────────────── */
        .user-body { display: flex; }
        .user-avatar-col { padding: 14px; flex-shrink: 0; }
        .user-avatar {
            width: 130px;
            height: 165px;
            object-fit: cover;
            border-radius: 4px;
            display: block;
            background: #e9ecef;
        }
        .user-no-avatar {
            width: 130px;
            height: 165px;
            background: #e9ecef;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .user-no-avatar svg { width: 48px; height: 48px; fill: #adb5bd; }
        .user-info-col { padding: 14px 14px 14px 0; flex: 1; min-width: 0; }
        .user-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }
        .user-table td { padding: 7px 10px; border: 1px solid #dee2e6; }
        .user-table td:first-child { color: #6c757d; white-space: nowrap; }
        .user-table td:last-child { font-weight: 700; color: #212529; }
        .user-table tr:nth-child(even) td { background: #f8f9fa; }

        /* ── Theme card ──────────────────────────────────────────────────── */
        .theme-body {
            padding: 14px;
            display: flex;
            gap: 20px;
            align-items: flex-start;
            flex-wrap: wrap;
        }
        .theme-asset-label {
            font-size: 0.82rem;
            font-weight: 700;
            color: #212529;
            margin-bottom: 6px;
        }
        .theme-banner {
            width: 220px;
            height: 148px;
            object-fit: cover;
            border-radius: 4px;
            display: block;
        }
        .theme-logo, .theme-favicon {
            width: 80px;
            height: 80px;
            object-fit: contain;
            border-radius: 4px;
            border: 1px solid #e0e4ea;
            background: #fff;
            display: block;
            padding: 4px;
            box-sizing: border-box;
        }
        .theme-ph {
            border-radius: 4px;
            background: #e9ecef;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #adb5bd;
            font-size: 0.75rem;
            font-style: italic;
        }
        .theme-ph.banner { width: 220px; height: 148px; }
        .theme-ph.logo, .theme-ph.favicon { width: 80px; height: 80px; }

        /* ── Contacts card ───────────────────────────────────────────────── */
        .contacts-hd {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 11px 14px;
            border-bottom: 1px solid #f0f2f5;
            flex-wrap: wrap;
        }
        .contacts-hd .hd-icon { width: 20px; height: 20px; fill: #495057; flex-shrink: 0; }
        .contacts-title { font-size: 0.95rem; font-weight: 700; color: #212529; }
        .contacts-search {
            padding: 4px 10px;
            font-size: 0.8rem;
            border: 1px solid #ced4da;
            border-radius: 5px;
            outline: none;
            width: 140px;
        }
        .contacts-search:focus { border-color: #0d6efd; }
        .pag-wrap {
            margin-left: auto;
            font-size: 0.8rem;
            color: #495057;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }
        .pag-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #0d6efd;
            font-size: 0.8rem;
            padding: 0 2px;
        }
        .pag-btn:disabled { color: #adb5bd; cursor: default; }
        .contacts-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }
        .contacts-table th {
            padding: 8px 12px;
            text-align: left;
            font-weight: 700;
            border-bottom: 2px solid #dee2e6;
            color: #212529;
        }
        .contacts-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #f0f2f5;
            color: #495057;
        }
        .empty-cell {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 20px 12px;
            color: #856404;
        }
        .empty-cell svg { fill: #ffc107; flex-shrink: 0; }
    `;

    // ── State ─────────────────────────────────────────────────────────────────

    @state() private siteUuid: string | null = null;
    @state() private cardNum:  string | null = null;
    @state() private activeTab: DashTab      = 'profile';
    @state() private site: SiteData | null   = null;
    @state() private user: SiteUser | null   = null;
    @state() private isLoading               = true;
    @state() private contactSearch           = '';
    @state() private contactPage             = 1;
    @state() private contactTotalPages       = 1;

    /** Guard so loadData() is only triggered once per mount */
    private _loadAttempted = false;

    /**
     * Arrow-function property so the same reference is used for both
     * addEventListener and removeEventListener on window.
     */
    private readonly _onSiteUpdated = (e: Event): void => {
        const detail = (e as CustomEvent<Record<string, unknown>>).detail;
        if (!detail || detail['uuid'] !== this.siteUuid || !this.site) return;

        /** Coerce to non-empty string or null (mirrors loadData normalisation). */
        const str = (v: unknown): string | null => {
            if (v == null) return null;
            const s = String(v).trim();
            return s === '' ? null : s;
        };

        // Merge only the fields this component displays; ignore unknowns.
        this.site = {
            ...this.site,
            ...(detail['site_name']  !== undefined && { site_name:   str(detail['site_name'])  }),
            ...(detail['domain']     !== undefined && { domain:      str(detail['domain'])     }),
            ...(detail['vanity_url'] !== undefined && { vanity_url:  str(detail['vanity_url']) }),
            ...(detail['status']     !== undefined && { status:      str(detail['status'])     }),
            ...(detail['owner_name'] !== undefined && { owner_name:  str(detail['owner_name']) }),
            ...(detail['banner_url'] !== undefined && { banner_url:  str(detail['banner_url']) }),
            ...(detail['logo_url']   !== undefined && { logo_url:    str(detail['logo_url'])   }),
            ...(detail['favicon_url']!== undefined && { favicon_url: str(detail['favicon_url'])}),
        };
    };

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override connectedCallback() {
        super.connectedCallback();
        window.addEventListener('maxr:site:updated', this._onSiteUpdated);
        // routingContext may already be set (component loaded via list navigation),
        // or it may arrive shortly after via the updated() hook (direct URL load).
        this.siteUuid = this.getRouteParam('uuid') ?? this.extractUuidFromUrl();
        this.cardNum  = this.getRouteParam('int') ?? null;
        if (this.siteUuid && this.runtime) {
            // Both UUID and runtime are available right now (list-navigation path)
            this._loadAttempted = true;
            void this.loadData();
        }
        // If either is missing, updated() will catch the subsequent property set.
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        window.removeEventListener('maxr:site:updated', this._onSiteUpdated);
    }

    /**
     * Called by Lit after every property update. When the DynComponentManager
     * sets routingContext and/or runtime AFTER connectedCallback (the common
     * case on a direct page load / bookmark), this hook catches the first
     * change and triggers the data fetch once both are available.
     */
    override updated(changed: PropertyValues): void {
        super.updated(changed);
        if (this._loadAttempted) return;

        if (changed.has('routingContext') || changed.has('runtime')) {
            // Refresh UUID in case routingContext just arrived
            if (changed.has('routingContext')) {
                this.siteUuid = this.getRouteParam('uuid') ?? this.extractUuidFromUrl();
                this.cardNum  = this.getRouteParam('int') ?? null;
            }

            if (this.siteUuid && this.runtime) {
                this._loadAttempted = true;
                void this.loadData();
            } else if (changed.has('routingContext') && !this.siteUuid) {
                // routingContext arrived but carried no UUID — nothing to load.
                this.isLoading = false;
            }
        }
    }

    /**
     * Last-resort fallback: scan the current URL path right-to-left for the
     * first UUID-shaped segment. Handles direct page loads where routingContext
     * params haven't been populated yet.
     */
    private extractUuidFromUrl(): string | null {
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const segments = window.location.pathname.split('/').filter(Boolean);
        for (let i = segments.length - 1; i >= 0; i--) {
            if (UUID_RE.test(segments[i])) return segments[i];
        }
        return null;
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    private async loadData(): Promise<void> {
        if (!this.runtime || !this.siteUuid) {
            this.isLoading = false;
            return;
        }
        this.isLoading = true;

        /** Coerce an API value to a non-empty string or null. */
        const str = (v: unknown): string | null => {
            if (v == null) return null;
            const s = String(v).trim();
            return s === '' ? null : s;
        };

        try {
            const [siteSettled, userSettled] = await Promise.allSettled([
                this.runtime.apiFetch(`/api/v1/sites/${this.siteUuid}`),
                this.runtime.apiFetch(`/api/v1/sites/${this.siteUuid}/user`),
            ]);

            if (siteSettled.status === 'fulfilled' && siteSettled.value.ok) {
                const body = await siteSettled.value.json() as Record<string, unknown>;
                const r    = (body.data ?? body) as Record<string, unknown>;
                this.site  = {
                    uuid:        String(r.uuid ?? this.siteUuid ?? ''),
                    site_num:    (r.site_num as number) ?? null,
                    site_name:   str(r.site_name),
                    domain:      str(r.domain),
                    vanity_url:  str(r.vanity_url),
                    template:    str(r.template),
                    owner_name:  str(r.owner_name),
                    status:      str(r.status),
                    banner_url:  str(r.banner_url),
                    logo_url:    str(r.logo_url),
                    favicon_url: str(r.favicon_url),
                };
                if (!this.cardNum && this.site.site_num != null) {
                    this.cardNum = String(this.site.site_num);
                }
                // Update the breadcrumb trail with the loaded site's name.
                this.runtime?.setBreadcrumbLabel(this.site.site_name ?? 'Site');
            }

            if (userSettled.status === 'fulfilled' && userSettled.value.ok) {
                const body = await userSettled.value.json() as Record<string, unknown>;
                const r    = (body.data ?? body) as Record<string, unknown>;
                this.user  = {
                    username:     str(r.username),
                    display_name: str(r.display_name) ?? str(r.name),
                    email:        str(r.email),
                    phone:        str(r.phone),
                    avatar_url:   str(r.avatar_url),
                    status:       str(r.status),
                };
            }
        } finally {
            this.isLoading = false;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private launchModal(componentId: string): void {
        if (!this.siteUuid) return;
        void this.runtime?.openModal(componentId, {
            maxWidth: '640px',
            routingContext: {
                behavior:      'silent',
                anchorSegment: this.siteUuid,
                anchorDepth:   3,
                routeParams:   { uuid: this.siteUuid },
            },
        });
    }

    private onBackClick(): void {
        this.navigateBack();
    }

    // ── Render ────────────────────────────────────────────────────────────────

    override render() {
        const num   = this.cardNum ?? this.site?.site_num?.toString() ?? null;
        const label = num ? `Site Dashboard: ${num}` : 'Site Dashboard';

        return html`
            <div class="dash-header">
                <button class="back-btn" aria-label="Go back" @click=${this.onBackClick}>
                    <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                </button>
                <span class="dash-title">${label}</span>
                <div class="tab-group">
                    ${this.renderTabBtn('profile',
                        html`<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
                        'Profile')}
                    ${this.renderTabBtn('editor',
                        html`<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
                        'Editor')}
                    ${this.renderTabBtn('contacts',
                        html`<svg viewBox="0 0 24 24"><path d="M20 0H4v2h16V0zM4 24h16v-2H4v2zM20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.75c1.24 0 2.25 1.01 2.25 2.25S13.24 11.25 12 11.25 9.75 10.24 9.75 9 10.76 6.75 12 6.75zM17 17H7v-.75c0-1.67 3.33-2.5 5-2.5s5 .83 5 2.5V17z"/></svg>`,
                        'Contacts')}
                    ${this.renderTabBtn('billing',
                        html`<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>`,
                        'Billing')}
                </div>
            </div>

            ${this.isLoading
                ? html`<div class="loading-state">Loading…</div>`
                : this.activeTab === 'profile'
                    ? this.renderProfileTab()
                    : this.renderComingSoon(this.activeTab)}`;
    }

    private renderTabBtn(tab: DashTab, icon: TemplateResult, label: string): TemplateResult {
        return html`
            <button class="tab-btn ${this.activeTab === tab ? 'active' : ''}"
                    @click=${() => { this.activeTab = tab; }}>
                ${icon} ${label}
            </button>`;
    }

    // ── Profile tab ───────────────────────────────────────────────────────────

    private renderProfileTab(): TemplateResult {
        return html`
            <div class="dash-body">
                <div class="card-grid">
                    ${this.renderSiteInfoCard()}
                    ${this.renderUserCard()}
                    ${this.renderThemeCard()}
                    ${this.renderContactsCard()}
                </div>
            </div>`;
    }

    // Card 1 — Site Info
    private renderSiteInfoCard(): TemplateResult {
        const s = this.site;
        return html`
            <div class="card">
                <div class="card-hd">
                    <svg class="hd-icon" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.75c1.24 0 2.25 1.01 2.25 2.25S13.24 11.25 12 11.25 9.75 10.24 9.75 9 10.76 6.75 12 6.75zM17 17H7v-.75c0-1.67 3.33-2.5 5-2.5s5 .83 5 2.5V17z"/>
                    </svg>
                    <span class="card-title">Site Info</span>
                    <button class="edit-btn" aria-label="Edit site profile"
                            @click=${() => this.launchModal(PROFILE_MANAGE_ID)}>
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                </div>
                <div class="info-body">
                    <div class="info-row">
                        <span class="info-label">Site Name:</span>
                        <span class="info-value">${s?.site_name ?? '—'}</span>
                    </div>
                    <div class="info-row highlight">
                        <span class="info-label">Domain:</span>
                        <span class="info-value">${s?.domain ?? '—'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Vanity URL:</span>
                        <span class="info-value">${s?.vanity_url ?? '—'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Template:</span>
                        <span class="info-value">${s?.template ?? 'Default'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Site Owner:</span>
                        <span class="info-value">${s?.owner_name ?? '—'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="info-value">${s?.status ?? '—'}</span>
                    </div>
                </div>
            </div>`;
    }

    // Card 2 — Site User
    private renderUserCard(): TemplateResult {
        const u        = this.user;
        const userName = u?.display_name ?? u?.username ?? this.site?.owner_name ?? '—';
        return html`
            <div class="card">
                <div class="card-hd">
                    <svg class="hd-icon" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <span class="card-title">Site User: ${userName}</span>
                    <button class="edit-btn" aria-label="Edit site user"
                            @click=${() => this.launchModal(USER_MANAGE_ID)}>
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                </div>
                <div class="user-body">
                    <div class="user-avatar-col">
                        ${u?.avatar_url
                            ? html`<img class="user-avatar" src=${u.avatar_url} alt="User avatar" />`
                            : html`
                                <div class="user-no-avatar">
                                    <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                </div>`}
                    </div>
                    <div class="user-info-col">
                        <table class="user-table">
                            <tr><td>User:</td>  <td>${u?.username     ?? '—'}</td></tr>
                            <tr><td>Email:</td>  <td>${u?.email        ?? '—'}</td></tr>
                            <tr><td>Phone:</td>  <td>${u?.phone        ?? '—'}</td></tr>
                            <tr><td>Status:</td> <td>${u?.status       ?? '—'}</td></tr>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    // Card 3 — Theme Settings
    private renderThemeCard(): TemplateResult {
        const s = this.site;
        return html`
            <div class="card">
                <div class="card-hd">
                    <svg class="hd-icon" viewBox="0 0 24 24">
                        <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-5-7l-4 5-3-3.5L5 17h14l-3-5z"/>
                    </svg>
                    <span class="card-title">Theme Settings</span>
                    <button class="edit-btn" aria-label="Edit theme settings"
                            @click=${() => this.launchModal(THEME_SETTINGS_ID)}>
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                </div>
                <div class="theme-body">
                    <div>
                        <div class="theme-asset-label">Site Banner</div>
                        ${s?.banner_url
                            ? html`<img class="theme-banner" src=${s.banner_url} alt="Site banner" />`
                            : html`<div class="theme-ph banner">No banner</div>`}
                    </div>
                    <div>
                        <div class="theme-asset-label">Logo</div>
                        ${s?.logo_url
                            ? html`<img class="theme-logo" src=${s.logo_url} alt="Logo" />`
                            : html`<div class="theme-ph logo">No logo</div>`}
                    </div>
                    <div>
                        <div class="theme-asset-label">Favicon</div>
                        ${s?.favicon_url
                            ? html`<img class="theme-favicon" src=${s.favicon_url} alt="Favicon" />`
                            : html`<div class="theme-ph favicon">No favicon</div>`}
                    </div>
                </div>
            </div>`;
    }

    // Card 4 — Contacts (stub layout; component fleshed out later)
    private renderContactsCard(): TemplateResult {
        return html`
            <div class="card">
                <div class="contacts-hd">
                    <svg class="hd-icon" viewBox="0 0 24 24">
                        <path d="M20 0H4v2h16V0zM4 24h16v-2H4v2zM20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.75c1.24 0 2.25 1.01 2.25 2.25S13.24 11.25 12 11.25 9.75 10.24 9.75 9 10.76 6.75 12 6.75zM17 17H7v-.75c0-1.67 3.33-2.5 5-2.5s5 .83 5 2.5V17z"/>
                    </svg>
                    <span class="contacts-title">Contacts</span>
                    <input class="contacts-search" type="text" placeholder="Search…"
                           .value=${this.contactSearch}
                           @input=${(e: Event) => { this.contactSearch = (e.target as HTMLInputElement).value; }} />
                    <div class="pag-wrap">
                        Current:&nbsp;<strong>${this.contactPage}</strong>
                        &nbsp;Pages:&nbsp;<strong>${this.contactTotalPages}</strong>
                        &nbsp;
                        <button class="pag-btn"
                                ?disabled=${this.contactPage <= 1}
                                @click=${() => { this.contactPage = Math.max(1, this.contactPage - 1); }}>Prev</button>
                        <button class="pag-btn"
                                ?disabled=${this.contactPage >= this.contactTotalPages}
                                @click=${() => { this.contactPage = Math.min(this.contactTotalPages, this.contactPage + 1); }}>Next</button>
                    </div>
                </div>
                <table class="contacts-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Name</th>
                            <th>Messages</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="4">
                                <span class="empty-cell">
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                                    </svg>
                                    No contacts yet…
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
    }

    // ── Other tabs ────────────────────────────────────────────────────────────

    private renderComingSoon(tab: DashTab): TemplateResult {
        const name = tab.charAt(0).toUpperCase() + tab.slice(1);
        return html`<div class="dash-body"><div class="coming-soon">${name} — coming soon</div></div>`;
    }
}
