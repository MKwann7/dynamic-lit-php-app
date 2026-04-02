import { customElement } from 'lit/decorators.js';
import { MaxrSiteDashboard } from '@maxr/my-site-dashboard';

@customElement('maxr-admin-site-dashboard')
export class MaxrAdminSiteDashboard extends MaxrSiteDashboard {
    // Inherits the full site dashboard UI.
    // The admin version is loaded from the admin sites shell, which passes
    // route params the same way as the account shell — no further overrides
    // are needed here until admin-specific behaviour is required.
}

