import { customElement } from 'lit/decorators.js';
import { MaxrGroupDashboard } from '@maxr/my-group-dashboard';

@customElement('maxr-admin-group-dashboard')
export class MaxrAdminGroupDashboard extends MaxrGroupDashboard {
    // Inherits the full group dashboard UI.
    // Extend here when admin-specific behaviour is needed.
}
