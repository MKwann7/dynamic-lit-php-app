import { MaxrUsersList } from './users-list';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-users-list')) {
        customElements.define('maxr-users-list', MaxrUsersList);
    }
}
