import { customElement } from 'lit/decorators.js';
import { MaxrGroupShell } from '@maxr/my-group-shell';

@customElement('maxr-admin-groups-shell')
export class MaxrAdminGroupsShell extends MaxrGroupShell {
    // Inherits the account group-shell chrome.
    // component.json dependencies point this shell at the admin list and
    // admin dashboard components instead of the account equivalents.
}
