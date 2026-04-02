import { css, html, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseEntityList } from '@dynlit/shared';
import type { FieldDef, FilterDef } from '@dynlit/shared';

/** UUID of the Site Dashboard component */
const DASHBOARD_COMPONENT_ID = '9bf9e360-1a53-402d-a7ea-612b947ca293';

interface SiteItem extends Record<string, unknown> {
    uuid:        string | null;
    site_num:    number | null;
    site_name:   string | null;
    platform:    string | null;
    vanity_url:  string | null;
    owner_name:  string | null;
    status:      'active' | 'build' | 'inactive' | null;
    product:     string | null;
    banner_url:  string | null;
    created_at:  string | null;
    updated_at:  string | null;
}

@customElement('dynlit-my-groups-list')
export class DynLitMyGroupsList extends BaseEntityList<SiteItem> {

    // ── Config ────────────────────────────────────────────────────────────────

    protected override apiPath = '/api/v1/groups';

    /** When set, fetches groups for the given user UUID (admin view).
     *  Otherwise scopes to the logged-in user's owned groups. */
    @property({ type: String, attribute: 'user-uuid' })
    userUuid: string | null = null;

    /** Restrict to groups where the logged-in user is the owner */
    protected override buildExtraParams(): Record<string, string> {
        if (this.userUuid) return { user_uuid: this.userUuid };
        return { scope: 'owned' };
    }

    override updated(changed: PropertyValues): void {
        super.updated(changed);
        if (changed.has('userUuid') && this.runtime) {
            void this.fetchItems(1);
        }
    }

    protected override fields: FieldDef<SiteItem>[] = [
        {
            key: 'site_name', label: 'Site Name',
            searchable: true, card: true, list: true, truncate: true,
        },
        {
            key: 'site_num', label: 'Card #',
            searchable: false, card: false, list: true,
        },
        {
            key: 'status', label: 'Status',
            searchable: false, card: true, list: true,
            format: (v) => {
                const s = String(v ?? '');
                const colour = s === 'active' ? '#0d6efd'
                    : s === 'build' ? '#dc3545'
                    : '#6c757d';
                return html`<span class="badge" style="background:${colour};">${s || '—'}</span>`;
            },
        },
        {
            key: 'vanity_url', label: 'Vanity URL',
            searchable: true, card: false, list: true,
        },
        {
            key: 'platform', label: 'Platform',
            searchable: false, card: false, list: true,
        },
        {
            key: 'owner_name', label: 'Owner',
            searchable: true, card: false, list: true,
        },
        {
            key: 'product', label: 'Product',
            searchable: false, card: false, list: true,
        },
        {
            key: 'created_at', label: 'Created',
            searchable: false, card: true, list: true,
        },
    ];

    protected override get filters(): FilterDef[] {
        return [
            { value: 'Everything', label: 'Everything' },
            { value: 'Active',     label: 'Active' },
            { value: 'Templates',  label: 'Templates' },
        ];
    }

    protected override get createLabel() { return 'Purchase New Card'; }

    protected override get itemUpdatedEvent() { return 'dynlit:group:updated'; }

    // ── Styles (extends base) ─────────────────────────────────────────────────

    static override styles = [
        BaseEntityList.styles,
        css`.badge { font-size: 0.7rem; }`,
    ];

    // ── Configurable property ─────────────────────────────────────────────────

    @property({ type: String, attribute: 'dashboard-component-id' })
    dashboardComponentId: string = DASHBOARD_COMPONENT_ID;

    // ── Banner ────────────────────────────────────────────────────────────────

    protected override getBannerUrl(item: SiteItem): string | null {
        return item.banner_url ?? null;
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    protected override onItemOpen(item: SiteItem): void {
        const { uuid } = item;
        if (!uuid) return;

        const mountRecord = this.runtime?.getActiveMountRecord();
        const basePath = (mountRecord?.activePath ?? window.location.pathname)
            .replace(/\/+$/, '');

        const fullPath = this.routingContext
            ? `${basePath}/${uuid}`              // standalone: /account/groups/{uuid}
            : `${basePath}/groups/${uuid}`;      // embedded:   /…/users/{userUuid}/groups/{uuid}

        const anchorDepth = fullPath.split('/').filter(Boolean).length - 1;

        void this.runtime?.loadComponentById(this.dashboardComponentId, {
            transitionType: 'left',
            path: fullPath,
            routingContext: {
                behavior:      'route',
                anchorSegment: uuid,
                anchorDepth,
                routeParams:   { uuid },
            },
        });
    }
}
