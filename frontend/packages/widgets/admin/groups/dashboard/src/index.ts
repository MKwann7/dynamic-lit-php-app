import { MaxrAdminGroupDashboard } from './admin-group-dashboard';

export { MaxrAdminGroupDashboard };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-admin-group-dashboard')) {
        customElements.define('maxr-admin-group-dashboard', MaxrAdminGroupDashboard);
    }
}
