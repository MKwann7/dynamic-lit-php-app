import { html, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseEntityList } from '@maxr/shared';
import type { FieldDef, FilterDef } from '@maxr/shared';

/** UUID of the Site Dashboard component */
const DASHBOARD_COMPONENT_ID = '5f87e9f7-c5ed-40ab-abc1-944a8733a3c4';

interface SiteItem extends Record<string, unknown> {
    uuid:        string | null;
    site_num:    number | null;
    site_name:   string | null;
    vanity_url:  string | null;
    owner_name:  string | null;
    status:      'active' | 'build' | 'inactive' | null;
    product:     string | null;
    banner_url:  string | null;
    created_at:  string | null;
    updated_at:  string | null;
}

@customElement('maxr-my-sites-list')
export class MaxrMySitesList extends BaseEntityList<SiteItem> {

    // ── Config ────────────────────────────────────────────────────────────────

    protected override apiPath = '/api/v1/sites';

    /** When set, fetches sites for the given user UUID (admin view).
     *  Otherwise scopes to the logged-in user's owned sites. */
    @property({ type: String, attribute: 'user-uuid' })
    userUuid: string | null = null;

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
            key: 'site_num', label: 'Site #',
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
            key: 'domain', label: 'Domain',
            searchable: true, card: false, list: true,
        },
        {
            key: 'vanity_url', label: 'Vanity URL',
            searchable: true, card: false, list: true,
        },
        {
            key: 'owner_name', label: 'Owner',
            searchable: true, card: false, list: true,
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

    protected override get createLabel() { return 'Create New Site'; }

    protected override get itemUpdatedEvent() { return 'maxr:site:updated'; }


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

        // Determine the base path from the mount that owns this component.
        // getActiveMountRecord() returns the record for this element's own mount,
        // so activePath is always the path of the component currently shown there.
        const mountRecord = this.runtime?.getActiveMountRecord();
        const basePath = (mountRecord?.activePath ?? window.location.pathname)
            .replace(/\/+$/, '');

        // When this list IS the active mount owner (routingContext is set by the
        // manager), basePath already ends with the section slug, e.g. /account/sites.
        // When it is rendered inline inside a parent dashboard (no routingContext),
        // basePath ends at the parent UUID, so we must append the section slug.
        const fullPath = this.routingContext
            ? `${basePath}/${uuid}`              // standalone: /account/sites/{uuid}
            : `${basePath}/sites/${uuid}`;       // embedded:   /…/users/{userUuid}/sites/{uuid}

        // anchorDepth = zero-based index of the UUID segment in fullPath
        const anchorDepth = fullPath.split('/').filter(Boolean).length - 1;

        void this.runtime?.loadComponentById(this.dashboardComponentId, {
            transitionType: 'left',
            path: fullPath,
            routingContext: {
                behavior:     'route',
                anchorSegment: uuid,
                anchorDepth,
                routeParams:  { uuid },
            },
        });
    }
}
