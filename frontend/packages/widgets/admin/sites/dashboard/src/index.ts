import { DynLitAdminSiteDashboard } from './admin-site-dashboard';

export { DynLitAdminSiteDashboard };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-admin-site-dashboard')) {
        customElements.define('dynlit-admin-site-dashboard', DynLitAdminSiteDashboard);
    }
}

