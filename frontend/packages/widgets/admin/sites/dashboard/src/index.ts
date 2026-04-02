import { MaxrAdminSiteDashboard } from './admin-site-dashboard';

export { MaxrAdminSiteDashboard };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-admin-site-dashboard')) {
        customElements.define('maxr-admin-site-dashboard', MaxrAdminSiteDashboard);
    }
}

