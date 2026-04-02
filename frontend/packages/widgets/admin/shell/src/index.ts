import {DynLitAdminShell} from './admin';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-admin-shell')) {
        customElements.define('dynlit-admin-shell', DynLitAdminShell);
    }
}