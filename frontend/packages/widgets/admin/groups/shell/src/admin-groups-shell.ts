import { customElement } from 'lit/decorators.js';
import { DynLitGroupShell } from '@dynlit/my-group-shell';

@customElement('dynlit-admin-groups-shell')
export class DynLitAdminGroupsShell extends DynLitGroupShell {
    // Inherits the account group-shell chrome.
    // component.json dependencies point this shell at the admin list and
    // admin dashboard components instead of the account equivalents.
}
