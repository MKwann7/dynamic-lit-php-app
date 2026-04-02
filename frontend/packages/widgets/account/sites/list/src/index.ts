import { MaxrMySitesList } from './my-sites-list';

export { MaxrMySitesList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-sites-list')) {
        customElements.define('maxr-my-sites-list', MaxrMySitesList);
    }
}
