import { DynLitMySitesList } from './my-sites-list';

export { DynLitMySitesList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-sites-list')) {
        customElements.define('dynlit-my-sites-list', DynLitMySitesList);
    }
}
