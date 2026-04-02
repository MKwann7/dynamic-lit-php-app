import { MaxrAdminGroupsShell } from './admin-groups-shell';

export { MaxrAdminGroupsShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-admin-groups-shell')) {
        customElements.define('maxr-admin-groups-shell', MaxrAdminGroupsShell);
    }
}
