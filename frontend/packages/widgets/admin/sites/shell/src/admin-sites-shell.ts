import { customElement } from 'lit/decorators.js';
import { MaxrSiteShell } from '@maxr/my-site-shell';

@customElement('maxr-admin-sites-shell')
export class MaxrAdminSitesShell extends MaxrSiteShell {
    // Inherits the account site-shell chrome.
    // The component.json dependencies point this shell at the admin list and
    // admin dashboard components instead of the account equivalents.
}

