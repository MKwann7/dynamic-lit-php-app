import { css, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

// Import list classes — the @customElement decorator on each class
// registers the custom element automatically on import.
import '@dynlit/my-personas-list';
import '@dynlit/my-sites-list';
import '@dynlit/my-groups-list';

/** UUID of the User Profile Manage modal component */
const PROFILE_MANAGE_ID = '7b3f9c2e-1a4d-4e8b-a5f6-9d2c1b8e3a7f';
/** UUID of the Manage Image modal component */
const MANAGE_IMAGE_ID   = '9acf0ea8-a2ab-4cf8-9238-70e1db06acac';

interface UserData {
    uuid:       string;
    user_num:   number | null;
    first_name: string | null;
    last_name:  string | null;
    username:   string | null;
    email:      string | null;
    phone:      string | null;
    avatar_url: string | null;
    status:     string | null;
}

@customElement('dynlit-user-dashboard')
export class DynLitUserDashboard extends RuntimeWidgetElement {

    // ── Light DOM so embedded list components inherit Bootstrap styles ─────────
    override createRenderRoot() {
        this._injectLightStyles();
        return this;
    }

    static styles = css`
        dynlit-user-dashboard { display: block; background: #f0f2f5; min-height: 100%; }

        /* ── Header ──────────────────────────────────────────────────────── */
        .udash-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            background: #fff;
            border-bottom: 1px solid #dee2e6;
        }
        .udash-back-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px; height: 32px;
            border-radius: 6px;
            background: #dc3545;
            border: none;
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.12s;
        }
        .udash-back-btn:hover { background: #b02a37; }
        .udash-back-btn svg { width: 16px; height: 16px; fill: #fff; }
        .udash-title { font-size: 1rem; font-weight: 700; color: #212529; flex: 1; }

        /* ── Body & grid ─────────────────────────────────────────────────── */
        .udash-body { padding: 16px; }
        .udash-loading { padding: 48px; text-align: center; color: #6c757d; font-size: 0.95rem; }
        .udash-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        /* ── Card shell ──────────────────────────────────────────────────── */
        .udash-card {
            background: #fff;
            border: 1px solid #e0e4ea;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .udash-card-hd {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 11px 14px;
            border-bottom: 1px solid #f0f2f5;
        }
        .udash-hd-icon { width: 20px; height: 20px; fill: #495057; flex-shrink: 0; }
        .udash-card-title { font-size: 0.95rem; font-weight: 700; color: #212529; flex: 1; }

        /* sign-in icon */
        .udash-login-icon {
            width: 20px; height: 20px;
            fill: #495057; flex-shrink: 0;
            cursor: pointer; transition: fill 0.12s;
        }
        .udash-login-icon:hover { fill: #0d6efd; }

        /* edit pencil button */
        .udash-edit-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 24px; height: 24px;
            border-radius: 50%; background: #198754;
            border: none; cursor: pointer; flex-shrink: 0; padding: 0;
            transition: background 0.12s;
        }
        .udash-edit-btn:hover { background: #146c43; }
        .udash-edit-btn svg { width: 13px; height: 13px; fill: #fff; }

        /* ── Profile card body ───────────────────────────────────────────── */
        .udash-user-body { display: flex; }
        .udash-avatar-col { padding: 14px; flex-shrink: 0; }

        /* ── Clickable avatar wrap ───────────────────────────────────────── */
        .udash-avatar-wrap {
            position: relative;
            display: inline-block;
            cursor: pointer;
            border-radius: 4px;
            overflow: hidden;
        }
        .udash-avatar-overlay {
            position: absolute; inset: 0;
            background: rgba(0, 0, 0, 0);
            display: flex; align-items: center; justify-content: center;
            transition: background 0.15s;
            border-radius: 4px;
        }
        .udash-avatar-wrap:hover .udash-avatar-overlay { background: rgba(0, 0, 0, 0.42); }
        .udash-avatar-overlay svg {
            width: 30px; height: 30px; fill: #fff;
            opacity: 0; transition: opacity 0.15s;
        }
        .udash-avatar-wrap:hover .udash-avatar-overlay svg { opacity: 1; }

        .udash-avatar { width: 130px; height: 165px; object-fit: cover; border-radius: 4px; display: block; }
        .udash-no-avatar {
            width: 130px; height: 165px;
            background: #e9ecef; border-radius: 4px;
            display: flex; align-items: center; justify-content: center;
        }
        .udash-no-avatar svg { width: 56px; height: 56px; fill: #adb5bd; }
        .udash-info-col { padding: 14px 14px 14px 0; flex: 1; min-width: 0; }
        .udash-info-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .udash-info-table td { padding: 7px 10px; border: 1px solid #dee2e6; }
        .udash-info-table td:first-child { color: #6c757d; white-space: nowrap; }
        .udash-info-table td:last-child  { font-weight: 700; color: #212529; }
        .udash-info-table tr:nth-child(even) td { background: #f8f9fa; }

        /* ── List-card body ──────────────────────────────────────────────── */
        .udash-list-body { flex: 1; overflow: auto; }
        .udash-list-body dynlit-my-personas-list,
        .udash-list-body dynlit-my-sites-list,
        .udash-list-body dynlit-my-groups-list { display: block; width: 100%; }
    `;

    // ── State ─────────────────────────────────────────────────────────────────

    @state() private userUuid: string | null = null;
    @state() private user: UserData | null   = null;
    @state() private isLoading               = true;

    private _loadAttempted = false;

    /** Bound reference kept so the listener can be removed when the modal closes. */
    private _boundOnAvatarImageSaved?: (e: Event) => void;

    private readonly _onUserUpdated = (e: Event): void => {
        const detail = (e as CustomEvent<Record<string, unknown>>).detail;
        if (!detail || detail['uuid'] !== this.userUuid || !this.user) return;
        const str = (v: unknown): string | null => {
            if (v == null) return null;
            const s = String(v).trim();
            return s === '' ? null : s;
        };
        this.user = {
            ...this.user,
            ...(detail['first_name'] !== undefined && { first_name: str(detail['first_name']) }),
            ...(detail['last_name']  !== undefined && { last_name:  str(detail['last_name'])  }),
            ...(detail['username']   !== undefined && { username:   str(detail['username'])   }),
            ...(detail['email']      !== undefined && { email:      str(detail['email'])      }),
            ...(detail['phone']      !== undefined && { phone:      str(detail['phone'])      }),
            ...(detail['status']     !== undefined && { status:     str(detail['status'])     }),
            ...(detail['avatar_url'] !== undefined && { avatar_url: str(detail['avatar_url']) }),
        };
    };

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override connectedCallback() {
        super.connectedCallback();
        window.addEventListener('dynlit:user:updated', this._onUserUpdated);
        this.userUuid = this.getRouteParam('uuid') ?? this.extractUuidFromUrl();
        if (this.userUuid && this.runtime) {
            this._loadAttempted = true;
            void this.loadData();
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        window.removeEventListener('dynlit:user:updated', this._onUserUpdated);
        if (this._boundOnAvatarImageSaved) {
            window.removeEventListener('dynlit:image:saved', this._boundOnAvatarImageSaved);
        }
    }

    override updated(changed: PropertyValues): void {
        super.updated(changed);
        if (this._loadAttempted) return;
        if (changed.has('routingContext') || changed.has('runtime')) {
            if (changed.has('routingContext')) {
                this.userUuid = this.getRouteParam('uuid') ?? this.extractUuidFromUrl();
            }
            if (this.userUuid && this.runtime) {
                this._loadAttempted = true;
                void this.loadData();
            } else if (changed.has('routingContext') && !this.userUuid) {
                this.isLoading = false;
            }
        }
    }

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
        if (!this.runtime || !this.userUuid) { this.isLoading = false; return; }
        this.isLoading = true;
        const str = (v: unknown): string | null => {
            if (v == null) return null;
            const s = String(v).trim();
            return s === '' ? null : s;
        };
        try {
            const res = await this.runtime.apiFetch(`/api/v1/users/${this.userUuid}`);
            if (res.ok) {
                const body = await res.json() as Record<string, unknown>;
                const r    = (body.data ?? body) as Record<string, unknown>;
                this.user  = {
                    uuid:       String(r.uuid ?? this.userUuid ?? ''),
                    user_num:   typeof r.user_num === 'number' ? r.user_num : null,
                    first_name: str(r.first_name),
                    last_name:  str(r.last_name),
                    username:   str(r.username),
                    email:      str(r.email),
                    phone:      str(r.phone),
                    avatar_url: str(r.avatar_url),
                    status:     str(r.status),
                };
                // Update the breadcrumb trail with the loaded user's full name.
                const fullName = [this.user.first_name, this.user.last_name]
                    .filter(Boolean).join(' ') || this.user.username || 'User';
                this.runtime?.setBreadcrumbLabel(fullName);
            }
        } finally {
            this.isLoading = false;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private launchProfileManage(): void {
        if (!this.userUuid) return;
        void this.runtime?.openModal(PROFILE_MANAGE_ID, {
            maxWidth: '600px',
            routingContext: {
                behavior:      'silent',
                anchorSegment: this.userUuid,
                anchorDepth:   3,
                routeParams:   { uuid: this.userUuid },
            },
        });
    }

    private launchAvatarManage(): void {
        if (!this.userUuid) return;

        // Register a one-shot handler — fires when manage-image dispatches dynlit:image:saved.
        const handler = (e: Event) => {
            window.removeEventListener('dynlit:image:saved', handler);
            this._boundOnAvatarImageSaved = undefined;
            void this._onAvatarImageSaved((e as CustomEvent<Record<string, unknown>>).detail);
        };
        this._boundOnAvatarImageSaved = handler;
        window.addEventListener('dynlit:image:saved', handler);

        void this.runtime?.openModal(MANAGE_IMAGE_ID, {
            maxWidth: '680px',
            onClose: () => {
                // Clean up if the modal was dismissed without saving.
                if (this._boundOnAvatarImageSaved) {
                    window.removeEventListener('dynlit:image:saved', this._boundOnAvatarImageSaved);
                    this._boundOnAvatarImageSaved = undefined;
                }
            },
            routingContext: {
                behavior:    'silent',
                routeParams: {
                    userUuid:         this.userUuid ?? '',
                    entityName:       'user',
                    entityUuid:       this.userUuid ?? '',
                    imageClass:       'avatar',
                    currentImageUrl:  this.user?.avatar_url ?? '',
                    currentImageUuid: '',
                },
            },
        });
    }

    private async _onAvatarImageSaved(data: Record<string, unknown>): Promise<void> {
        // manage-image returns { image, thumb, image_id, image_uuid, ... }
        const avatarUrl = (data['image'] ?? '') as string;
        if (!avatarUrl || !this.userUuid || !this.runtime) return;

        try {
            const res = await this.runtime.apiFetch(
                `/api/v1/users/${this.userUuid}/avatar`,
                {
                    method:  'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ avatar_url: avatarUrl }),
                },
            );
            if (res.ok && this.user) {
                this.user = { ...this.user, avatar_url: avatarUrl };
                window.dispatchEvent(new CustomEvent('dynlit:user:updated', {
                    detail: { uuid: this.userUuid, avatar_url: avatarUrl },
                }));
            }
        } catch {
            // Silent fail — the image was saved to the media server; the user
            // can re-link it via the Profile edit modal if needed.
        }
    }

    private onBackClick(): void { this.navigateBack(); }

    // ── Render ────────────────────────────────────────────────────────────────

    override render() {
        const username   = this.user?.username?.toString() ?? null;
        const label = username ? `User Dashboard: ${username}` : 'User Dashboard';

        return html`
            <div class="udash-header">
                <button class="udash-back-btn" aria-label="Go back" @click=${this.onBackClick}>
                    <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                </button>
                <span class="udash-title">${label}</span>
            </div>

            ${this.isLoading
                ? html`<div class="udash-loading">Loading…</div>`
                : html`
                    <div class="udash-body">
                        <div class="udash-grid">
                            ${this.renderProfileCard()}
                            ${this.renderPersonasCard()}
                            ${this.renderSitesCard()}
                            ${this.renderGroupsCard()}
                        </div>
                    </div>`}`;
    }

    // ── Card 1: User Profile (top-left) ───────────────────────────────────────

    private renderProfileCard(): TemplateResult {
        const u        = this.user;
        const fullName = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || '—';

        return html`
            <div class="udash-card">
                <div class="udash-card-hd">
                    <!-- person icon -->
                    <svg class="udash-hd-icon" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <span class="udash-card-title">Profile</span>

                    <!-- sign-in / login arrow (→]) -->
                    <svg class="udash-login-icon" viewBox="0 0 24 24" title="Sign in as user">
                        <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
                    </svg>

                    <!-- edit pencil button -->
                    <button class="udash-edit-btn" aria-label="Edit user profile"
                            @click=${this.launchProfileManage}>
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                </div>

                <div class="udash-user-body">
                    <div class="udash-avatar-col">
                        <div class="udash-avatar-wrap"
                             @click=${this.launchAvatarManage}
                             title="Click to change avatar">
                            ${u?.avatar_url
                                ? html`<img class="udash-avatar" src=${u.avatar_url} alt="User avatar" />`
                                : html`
                                    <div class="udash-no-avatar">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                        </svg>
                                    </div>`}
                            <!-- camera icon overlay — visible on hover -->
                            <div class="udash-avatar-overlay">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M12 7a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5M3 7H1V5H0v2h1v2h2V9h2V7H3M17 3l1-2h-4l-1 2H7C5.9 3 5 3.9 5 5v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-4z"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="udash-info-col">
                        <table class="udash-info-table">
                            <tr><td>Full Name:</td><td>${fullName}</td></tr>
                            <tr><td>User Name</td> <td>${u?.username ?? '—'}</td></tr>
                            <tr><td>Phone:</td>     <td>${u?.phone   ?? '—'}</td></tr>
                            <tr><td>E-mail:</td>    <td>${u?.email   ?? '—'}</td></tr>
                            <tr><td>Status:</td>    <td>${u?.status  ?? '—'}</td></tr>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    // ── Card 2: Personas (top-right) ──────────────────────────────────────────

    private renderPersonasCard(): TemplateResult {
        return html`
            <div class="udash-card">
                <div class="udash-card-hd">
                    <!-- group / two-people icon -->
                    <svg class="udash-hd-icon" viewBox="0 0 24 24">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                    <span class="udash-card-title">Personas</span>
                </div>
                <div class="udash-list-body">
                    <dynlit-my-personas-list
                        .runtime=${this.runtime}
                        .userUuid=${this.userUuid}
                    ></dynlit-my-personas-list>
                </div>
            </div>`;
    }

    // ── Card 3: Sites (bottom-left) ───────────────────────────────────────────

    private renderSitesCard(): TemplateResult {
        return html`
            <div class="udash-card">
                <div class="udash-card-hd">
                    <!-- ID card / sites icon -->
                    <svg class="udash-hd-icon" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.75c1.24 0 2.25 1.01 2.25 2.25S13.24 11.25 12 11.25 9.75 10.24 9.75 9 10.76 6.75 12 6.75zM17 17H7v-.75c0-1.67 3.33-2.5 5-2.5s5 .83 5 2.5V17z"/>
                    </svg>
                    <span class="udash-card-title">Sites</span>
                </div>
                <div class="udash-list-body">
                    <dynlit-my-sites-list
                        .runtime=${this.runtime}
                        .userUuid=${this.userUuid}
                    ></dynlit-my-sites-list>
                </div>
            </div>`;
    }

    // ── Card 4: Groups (bottom-right) ─────────────────────────────────────────

    private renderGroupsCard(): TemplateResult {
        return html`
            <div class="udash-card">
                <div class="udash-card-hd">
                    <!-- bullet list / groups icon -->
                    <svg class="udash-hd-icon" viewBox="0 0 24 24">
                        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                    </svg>
                    <span class="udash-card-title">Groups</span>
                </div>
                <div class="udash-list-body">
                    <dynlit-my-groups-list
                        .runtime=${this.runtime}
                        .userUuid=${this.userUuid}
                    ></dynlit-my-groups-list>
                </div>
            </div>`;
    }
}
