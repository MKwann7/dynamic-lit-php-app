import {MaxrAdminShell} from './admin';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-admin-shell')) {
        customElements.define('maxr-admin-shell', MaxrAdminShell);
    }
}