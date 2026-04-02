import { customElement } from 'lit/decorators.js';
import { DynLitMyGroupsList } from '@dynlit/my-groups-list';

/** UUID of the Admin Group Dashboard component */
const ADMIN_DASHBOARD_COMPONENT_ID = 'e0908bdf-231d-413b-bd89-60f81184c9e1';

@customElement('dynlit-admin-groups-list')
export class DynLitAdminGroupsList extends DynLitMyGroupsList {

    /** Point navigation at the admin group dashboard */
    override dashboardComponentId: string = ADMIN_DASHBOARD_COMPONENT_ID;

    /**
     * Streams all groups that share the logged-in admin's whitelabel_id —
     * not limited to groups owned by the admin user.
     */
    protected override buildExtraParams(): Record<string, string> {
        return { scope: 'whitelabel' };
    }
}
