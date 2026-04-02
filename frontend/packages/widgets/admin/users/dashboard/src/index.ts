import { DynLitUserDashboard } from './user-dashboard';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-user-dashboard')) {
        customElements.define('dynlit-user-dashboard', DynLitUserDashboard);
    }
}
