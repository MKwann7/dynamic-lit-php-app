import { customElement } from 'lit/decorators.js';
import { DynLitMySitesList } from '@dynlit/my-sites-list';

/** UUID of the Admin Site Dashboard component */
const ADMIN_DASHBOARD_COMPONENT_ID = '259955dc-6deb-419b-a00f-e1da00734638';

@customElement('dynlit-admin-sites-list')
export class DynLitAdminSitesList extends DynLitMySitesList {

    /** Point navigation at the admin dashboard, not the account one */
    override dashboardComponentId: string = ADMIN_DASHBOARD_COMPONENT_ID;

    /**
     * Streams all sites that share the logged-in admin's whitelabel_id —
     * not limited to sites owned by / assigned to the admin user.
     */
    protected override buildExtraParams(): Record<string, string> {
        return { scope: 'whitelabel' };
    }
}

