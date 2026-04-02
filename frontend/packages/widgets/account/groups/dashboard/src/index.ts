import { DynLitGroupDashboard } from './my-group-dashboard';

export { DynLitGroupDashboard };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-group-dashboard')) {
        customElements.define('dynlit-my-group-dashboard', DynLitGroupDashboard);
    }
}
