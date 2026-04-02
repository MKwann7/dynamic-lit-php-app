import {DynLitPersonaDashboard} from './my-persona-dashboard';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-persona-dashboard')) {
        customElements.define('dynlit-my-persona-dashboard', DynLitPersonaDashboard);
    }
}
