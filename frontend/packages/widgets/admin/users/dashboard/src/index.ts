import { MaxrUserDashboard } from './user-dashboard';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-user-dashboard')) {
        customElements.define('maxr-user-dashboard', MaxrUserDashboard);
    }
}
