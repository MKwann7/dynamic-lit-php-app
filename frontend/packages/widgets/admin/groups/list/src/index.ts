import { MaxrAdminGroupsList } from './admin-groups-list';

export { MaxrAdminGroupsList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-admin-groups-list')) {
        customElements.define('maxr-admin-groups-list', MaxrAdminGroupsList);
    }
}
