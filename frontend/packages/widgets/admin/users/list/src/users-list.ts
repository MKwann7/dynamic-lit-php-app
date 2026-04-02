import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseEntityList } from '@dynlit/shared';
import type { FieldDef, FilterDef } from '@dynlit/shared';

/** UUID of the User Dashboard component */
const DASHBOARD_COMPONENT_ID = 'cd2e54fc-8e07-4f9a-8f9c-24f9c929976c';

interface UserItem extends Record<string, unknown> {
    uuid:       string | null;
    first_name: string | null;
    last_name:  string | null;
    email:      string | null;
    username:   string | null;
    status:     'active' | 'inactive' | null;
    created_at: string | null;
    updated_at: string | null;
}

@customElement('dynlit-users-list')
export class DynLitUsersList extends BaseEntityList<UserItem> {

    // ── Config ────────────────────────────────────────────────────────────────

    protected override apiPath = '/api/v1/users';

    /** Stream all users that share the logged-in admin's whitelabel_id */
    protected override buildExtraParams(): Record<string, string> {
        return { scope: 'whitelabel' };
    }

    protected override fields: FieldDef<UserItem>[] = [
        {
            key: 'first_name', label: 'First Name',
            searchable: true, card: true, list: true, truncate: true,
        },
        {
            key: 'last_name', label: 'Last Name',
            searchable: true, card: true, list: true, truncate: true,
        },
        {
            key: 'email', label: 'Email',
            searchable: true, card: true, list: true, truncate: true,
        },
        {
            key: 'username', label: 'Username',
            searchable: true, card: false, list: true,
        },
        {
            key: 'status', label: 'Status',
            searchable: false, card: true, list: true,
            format: (v) => {
                const s = String(v ?? '');
                const colour = s === 'active' ? '#0d6efd' : '#6c757d';
                return html`<span class="badge" style="background:${colour};">${s || '—'}</span>`;
            },
        },
        {
            key: 'created_at', label: 'Created',
            searchable: false, card: false, list: true,
        },
    ];

    protected override get filters(): FilterDef[] {
        return [
            { value: 'Everything', label: 'Everything' },
            { value: 'Active',     label: 'Active' },
            { value: 'Inactive',   label: 'Inactive' },
        ];
    }

    protected override get createLabel() { return 'Create New User'; }

    protected override get itemUpdatedEvent() { return 'dynlit:user:updated'; }


    // ── Configurable property ─────────────────────────────────────────────────

    @property({ type: String, attribute: 'dashboard-component-id' })
    dashboardComponentId: string = DASHBOARD_COMPONENT_ID;

    // ── Navigation ────────────────────────────────────────────────────────────

    protected override onItemOpen(item: UserItem): void {
        const { uuid } = item;
        if (!uuid) return;
        void this.runtime?.loadComponentById(this.dashboardComponentId, {
            transitionType: 'left',
            routingContext: {
                behavior:      'route',
                anchorSegment: uuid,
                anchorDepth:   2,
                routeParams:   { uuid },
            },
        });
    }
}
