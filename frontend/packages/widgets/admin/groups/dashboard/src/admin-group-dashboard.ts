import { customElement } from 'lit/decorators.js';
import { DynLitGroupDashboard } from '@dynlit/my-group-dashboard';

@customElement('dynlit-admin-group-dashboard')
export class DynLitAdminGroupDashboard extends DynLitGroupDashboard {
    // Inherits the full group dashboard UI.
    // Extend here when admin-specific behaviour is needed.
}
