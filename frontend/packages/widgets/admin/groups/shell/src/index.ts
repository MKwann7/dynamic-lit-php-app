import { DynLitAdminGroupsShell } from './admin-groups-shell';

export { DynLitAdminGroupsShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-admin-groups-shell')) {
        customElements.define('dynlit-admin-groups-shell', DynLitAdminGroupsShell);
    }
}
