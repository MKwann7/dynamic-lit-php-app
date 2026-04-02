import { MaxrGroupDashboard } from './my-group-dashboard';

export { MaxrGroupDashboard };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-group-dashboard')) {
        customElements.define('maxr-my-group-dashboard', MaxrGroupDashboard);
    }
}
