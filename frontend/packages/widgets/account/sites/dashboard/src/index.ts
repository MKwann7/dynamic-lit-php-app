import { DynLitSiteDashboard } from './my-site-dashboard';

export { DynLitSiteDashboard };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-site-dashboard')) {
        customElements.define('dynlit-my-site-dashboard', DynLitSiteDashboard);
    }
}
