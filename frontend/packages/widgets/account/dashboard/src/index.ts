import { DynLitAcountDashboard } from './account-dashboard';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-account-dashboard')) {
        customElements.define('dynlit-account-dashboard', DynLitAcountDashboard);
    }
}
