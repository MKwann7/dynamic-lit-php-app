import { DynLitAdminGroupDashboard } from './admin-group-dashboard';

export { DynLitAdminGroupDashboard };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-admin-group-dashboard')) {
        customElements.define('dynlit-admin-group-dashboard', DynLitAdminGroupDashboard);
    }
}
