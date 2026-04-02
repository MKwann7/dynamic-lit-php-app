import { DynLitUsersList } from './users-list';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-users-list')) {
        customElements.define('dynlit-users-list', DynLitUsersList);
    }
}
