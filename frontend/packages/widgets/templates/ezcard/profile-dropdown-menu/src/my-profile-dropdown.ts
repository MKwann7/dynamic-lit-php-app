import { css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

interface UserProfile {
    name: string;
    email: string;
    role: string;
    avatarUrl: string;
}

@customElement('dynlit-my-profile-dropdown')
export class DynLitMyProfileDropdown extends RuntimeWidgetElement {

    static styles = css`
        :host {
            display: block;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ── Panel shell ──────────────────────────────────────── */
        .dropdown-panel {
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, .15);
            width: 260px;
            overflow: hidden;
        }

        /* ── User identity header ─────────────────────────────── */
        .profile-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-bottom: 1px solid #dee2e6;
        }

        .profile-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, .15);
            flex-shrink: 0;
        }

        .profile-info {
            min-width: 0;
        }

        .profile-name {
            font-weight: 600;
            font-size: 0.9rem;
            color: #212529;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .profile-email {
            font-size: 0.775rem;
            color: #6c757d;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 1px;
        }

        .profile-role {
            display: inline-block;
            margin-top: 4px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 1px 7px;
            border-radius: 20px;
            background: #0d6efd22;
            color: #0d6efd;
        }

        /* ── Nav list ─────────────────────────────────────────── */
        .nav-list {
            list-style: none;
            margin: 0;
            padding: 6px 0;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 16px;
            font-size: 0.875rem;
            color: #343a40;
            cursor: pointer;
            text-decoration: none;
            transition: background 0.12s ease, color 0.12s ease;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
        }

        .nav-item:hover {
            background: #f1f3f5;
            color: #0d6efd;
        }

        .nav-item i {
            width: 18px;
            text-align: center;
            font-size: 0.9rem;
            color: #6c757d;
            flex-shrink: 0;
            transition: color 0.12s ease;
        }

        .nav-item:hover i {
            color: #0d6efd;
        }

        /* ── Divider ──────────────────────────────────────────── */
        .divider {
            height: 1px;
            background: #dee2e6;
            margin: 4px 0;
        }

        /* ── Logout row ───────────────────────────────────────── */
        .nav-item.logout {
            color: #dc3545;
        }

        .nav-item.logout i {
            color: #dc3545;
        }

        .nav-item.logout:hover {
            background: #fff5f5;
            color: #b02a37;
        }

        .nav-item.logout:hover i {
            color: #b02a37;
        }

        /* ── Loading / skeleton ───────────────────────────────── */
        .skeleton {
            background: linear-gradient(90deg, #e9ecef 25%, #f8f9fa 50%, #e9ecef 75%);
            background-size: 200% 100%;
            animation: shimmer 1.2s infinite;
            border-radius: 4px;
        }

        @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    `;

    @state() private profile: UserProfile | null = null;
    @state() private loading = true;

    connectedCallback() {
        super.connectedCallback();
        this._loadProfile();
    }

    private async _loadProfile(): Promise<void> {
        try {
            // Try to resolve a real user profile from the runtime identity / API.
            // Falls back to a sensible placeholder so the panel always renders.
            const identity = this.getAppIdentity();
            const token = this.getTokenPayload();

            const name  = (token?.data as any)?.name  ?? (token?.sub ?? 'User');
            const email = (token?.data as any)?.email ?? '';
            const role  = (token?.data as any)?.role  ?? identity?.type ?? 'Member';

            this.profile = {
                name:      String(name),
                email:     String(email),
                role:      String(role),
                avatarUrl: 'https://media.ezcard.com/images/users/1000/thumb/f558d88e0349a39f8db531325bb7d658793d5155.jpg',
            };
        } catch {
            this.profile = {
                name:      'Current User',
                email:     '',
                role:      'Member',
                avatarUrl: 'https://media.ezcard.com/images/users/1000/thumb/f558d88e0349a39f8db531325bb7d658793d5155.jpg',
            };
        } finally {
            this.loading = false;
        }
    }

    private _navigate(path: string): void {
        this.runtime?.closeModal();
        // Let the runtime handle navigation, or fall back to a direct href.
        if (this.runtime?.navigateTo) {
            void this.runtime.navigateTo(path);
        } else {
            window.location.href = path;
        }
    }

    private _logout(): void {
        // 1. Dismiss the popover immediately.
        this.runtime?.closeModal();

        // 2. Remove the stored token so the runtime finds nothing on next boot.
        //    The manager uses the key 'access_token' in localStorage.
        window.localStorage.removeItem('access_token');

        // 3. Redirect to the login page — the full navigation clears the
        //    manager's in-memory token state along with the rest of the app.
        window.location.assign('/login');
    }

    // ── Render helpers ──────────────────────────────────────────────────────

    private _renderSkeleton() {
        return html`
            <div class="dropdown-panel">
                <div class="profile-header">
                    <div class="skeleton" style="width:48px;height:48px;border-radius:50%;flex-shrink:0;"></div>
                    <div style="flex:1;min-width:0;">
                        <div class="skeleton" style="height:13px;width:70%;margin-bottom:6px;"></div>
                        <div class="skeleton" style="height:11px;width:90%;"></div>
                    </div>
                </div>
                <ul class="nav-list">
                    ${[1,2,3].map(() => html`
                        <li style="padding:9px 16px;">
                            <div class="skeleton" style="height:12px;width:60%;"></div>
                        </li>
                    `)}
                </ul>
            </div>`;
    }

    render() {
        if (this.loading) {
            return this._renderSkeleton();
        }

        const p = this.profile!;

        return html`
            <div class="dropdown-panel">

                <!-- ── Identity header ──────────────────────────── -->
                <div class="profile-header">
                    <img
                        src="${p.avatarUrl}"
                        class="profile-avatar"
                        alt="User avatar">
                    <div class="profile-info">
                        <div class="profile-name">${p.name}</div>
                        ${p.email ? html`<div class="profile-email">${p.email}</div>` : ''}
                        <span class="profile-role">${p.role}</span>
                    </div>
                </div>

                <!-- ── Navigation items ─────────────────────────── -->
                <ul class="nav-list" role="menu">
                    <li>
                        <button class="nav-item" role="menuitem"
                                @click=${() => this._navigate('/account/profile')}>
                            <i class="fas fa-user-circle"></i>
                            My Profile
                        </button>
                    </li>
                    <li>
                        <button class="nav-item" role="menuitem"
                                @click=${() => this._navigate('/account/settings')}>
                            <i class="fas fa-cog"></i>
                            Account Settings
                        </button>
                    </li>
                    <li>
                        <button class="nav-item" role="menuitem"
                                @click=${() => this._navigate('/account/billing')}>
                            <i class="fas fa-credit-card"></i>
                            Billing
                        </button>
                    </li>
                    <li>
                        <button class="nav-item" role="menuitem"
                                @click=${() => this._navigate('/help')}>
                            <i class="fas fa-question-circle"></i>
                            Help &amp; Support
                        </button>
                    </li>

                    <li><div class="divider" role="separator"></div></li>

                    <li>
                        <button class="nav-item logout" role="menuitem"
                                @click=${this._logout}>
                            <i class="fas fa-sign-out-alt"></i>
                            Sign Out
                        </button>
                    </li>
                </ul>

            </div>`;
    }
}
