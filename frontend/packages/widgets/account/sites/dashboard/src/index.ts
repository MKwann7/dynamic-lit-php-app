import { MaxrSiteDashboard } from './my-site-dashboard';

export { MaxrSiteDashboard };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-site-dashboard')) {
        customElements.define('maxr-my-site-dashboard', MaxrSiteDashboard);
    }
}
