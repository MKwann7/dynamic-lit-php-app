import {MaxrPersonaDashboard} from './my-persona-dashboard';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-persona-dashboard')) {
        customElements.define('maxr-my-persona-dashboard', MaxrPersonaDashboard);
    }
}
