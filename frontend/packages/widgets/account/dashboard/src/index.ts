import { MaxrAcountDashboard } from './account-dashboard';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-account-dashboard')) {
        customElements.define('maxr-account-dashboard', MaxrAcountDashboard);
    }
}
