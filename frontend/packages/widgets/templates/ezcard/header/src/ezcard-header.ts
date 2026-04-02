import {css, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';
import type { BreadcrumbItem } from '@maxr/shared';

/** UUID of the profile dropdown menu component */
const PROFILE_DROPDOWN_UUID = 'ad1701a6-00b1-4d29-b96f-716e96e2842e';

@customElement('maxr-ezcard-header')
export class EzcardHeader extends RuntimeWidgetElement {

    @state() private crumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];

    static styles = css`
        /* ── Layout shell ─────────────────────────────────────── */
        .header-bar {
            border-radius: 5px;
            box-shadow: rgba(0, 0, 0, .3) 0 0 7px;
            background: #ffffff;
            padding: 0.5rem 1rem;
        }

        /* ── Breadcrumb ────────────────────────────────────────── */
        .breadcrumb {
            background: transparent;
            padding: 0;
            margin: 0;
            display: flex;
            align-items: center;
            list-style: none;
            flex-wrap: wrap;
        }

        .breadcrumb-item + .breadcrumb-item::before {
            content: "/";
            padding: 0 0.4rem;
            color: #6c757d;
        }

        .breadcrumb-item a {
            color: #495057;
            text-decoration: none;
        }

        .breadcrumb-item a:hover {
            color: #212529;
        }

        .breadcrumb-item.active {
            font-weight: 600;
            color: #212529;
        }

        .breadcrumb-item .fa-home {
            font-size: 1.5rem;
        }

        /* ── Right-side action icons ───────────────────────────── */
        .header-icon {
            cursor: pointer;
            font-size: 1rem;
            color: #495057;
            line-height: 1;
        }
        .header-icon.header-icon-alert {
            font-size: 1.3rem;
        }

        .header-icon:hover {
            color: #212529;
        }

        .header-lang {
            font-size: 0.875rem;
            color: #495057;
        }

        /* ── Avatar ────────────────────────────────────────────── */
        .header-avatar {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            object-fit: cover;
            cursor: pointer;
            border: 2px solid transparent;
            transition: border-color 0.15s ease;
        }

        .header-avatar:hover {
            border-color: #0d6efd;
        }

        /* ── Responsive helpers ────────────────────────────────── */
        @media (max-width: 767.98px) {
            .hide-on-mobile { display: none !important; }
        }

        @media (min-width: 768px) {
            .show-on-mobile { display: none !important; }
        }
    `;

    /** Stable reference so addEventListener/removeEventListener match. */
    private readonly _onBreadcrumbUpdate = (e: Event): void => {
        const items = (e as CustomEvent<BreadcrumbItem[]>).detail;
        if (Array.isArray(items)) {
            this.crumbs = items;
        }
    };

    override connectedCallback() {
        super.connectedCallback();
        this.runtime?.on('breadcrumb:update', this._onBreadcrumbUpdate);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.runtime?.off('breadcrumb:update', this._onBreadcrumbUpdate);
    }

    private onAvatarClick(e: MouseEvent): void {
        const anchor = e.currentTarget as HTMLElement;
        void this.runtime?.openAnchoredModal(PROFILE_DROPDOWN_UUID, anchor, {
            placement: 'bottom-end',
        });
    }

    render() {
        return html`
            <div class="header-bar d-flex justify-content-between align-items-center">

                <!-- ── Breadcrumb (left) ───────────────────────── -->
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-0">
                        ${this.crumbs.map((crumb, i) => {
                            const isHome  = i === 0;
                            const isActive = crumb.path === null;
                            const classes = [
                                'breadcrumb-item',
                                isHome   ? 'hide-on-mobile' : '',
                                isActive ? 'active'         : '',
                            ].filter(Boolean).join(' ');

                            const inner = isHome
                                ? html`<i class="fas fa-home"></i>`
                                : html`${crumb.label}`;

                            return html`
                                <li class="${classes}" aria-current=${isActive ? 'page' : nothing}>
                                    ${isActive
                                        ? inner
                                        : html`<a href="${crumb.path}" aria-label="${crumb.label}">${inner}</a>`}
                                </li>`;
                        })}
                    </ol>
                </nav>

                <!-- ── Logo (mobile only) ─────────────────────── -->
                <div class="site-logo show-on-mobile">
                    <a href="/account">
                        <span class="portalLogo"></span>
                    </a>
                </div>

                <!-- ── Right: actions + avatar ────────────────── -->
                <div class="d-flex align-items-center gap-3">
                    <span class="header-lang">English</span>
                    <i class="fas fa-search header-icon" aria-label="Search"></i>
                    <i class="far fa-bell header-icon header-icon-alert" aria-label="Notifications"></i>
                    <img
                        src="https://media.ezcard.com/images/users/1000/thumb/f558d88e0349a39f8db531325bb7d658793d5155.jpg"
                        class="header-avatar"
                        alt="User avatar"
                        @click=${this.onAvatarClick}>
                </div>

            </div>`;
    }
}
