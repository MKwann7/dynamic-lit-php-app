import { html, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseEntityList } from '@dynlit/shared';
import type { FieldDef, FilterDef } from '@dynlit/shared';

/** UUID of the Persona Dashboard component */
const DASHBOARD_COMPONENT_ID = 'aa027e48-80e2-48ed-8027-594d703f005e';

interface PersonaItem extends Record<string, unknown> {
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

@customElement('dynlit-my-personas-list')
export class DynLitMyPersonasList extends BaseEntityList<PersonaItem> {

    // ── Config ────────────────────────────────────────────────────────────────

    protected override apiPath = '/api/v1/personas';

    /** When set, fetches personas for the given user UUID (admin view). */
    @property({ type: String, attribute: 'user-uuid' })
    userUuid: string | null = null;

    protected override buildExtraParams(): Record<string, string> {
        if (this.userUuid) return { user_uuid: this.userUuid };
        return {};
    }

    override updated(changed: PropertyValues): void {
        super.updated(changed);
        if (changed.has('userUuid') && this.runtime) {
            void this.fetchItems(1);
        }
    }

    protected override fields: FieldDef<PersonaItem>[] = [
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

    protected override get itemUpdatedEvent() { return 'dynlit:persona:updated'; }

    // ── Configurable property ─────────────────────────────────────────────────

    @property({ type: String, attribute: 'dashboard-component-id' })
    dashboardComponentId: string = DASHBOARD_COMPONENT_ID;

    // ── Banner ────────────────────────────────────────────────────────────────

    protected override getBannerUrl(item: PersonaItem): string | null {
        return item.banner_url ?? null;
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    protected override onItemOpen(item: PersonaItem): void {
        const { uuid } = item;
        if (!uuid) return;

        const mountRecord = this.runtime?.getActiveMountRecord();
        const basePath = (mountRecord?.activePath ?? window.location.pathname)
            .replace(/\/+$/, '');

        const fullPath = this.routingContext
            ? `${basePath}/${uuid}`              // standalone: /account/personas/{uuid}
            : `${basePath}/personas/${uuid}`;    // embedded:   /…/users/{userUuid}/personas/{uuid}

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
