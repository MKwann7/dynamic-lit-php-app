import { customElement } from 'lit/decorators.js';
import { DynLitSiteShell } from '@dynlit/my-site-shell';

@customElement('dynlit-admin-sites-shell')
export class DynLitAdminSitesShell extends DynLitSiteShell {
    // Inherits the account site-shell chrome.
    // The component.json dependencies point this shell at the admin list and
    // admin dashboard components instead of the account equivalents.
}

