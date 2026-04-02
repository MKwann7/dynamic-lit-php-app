import { DynLitAdminGroupsList } from './admin-groups-list';

export { DynLitAdminGroupsList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-admin-groups-list')) {
        customElements.define('dynlit-admin-groups-list', DynLitAdminGroupsList);
    }
}
