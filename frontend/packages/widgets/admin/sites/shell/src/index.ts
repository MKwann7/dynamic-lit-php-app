import { DynLitAdminSitesShell } from './admin-sites-shell';

export { DynLitAdminSitesShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-admin-sites-shell')) {
        customElements.define('dynlit-admin-sites-shell', DynLitAdminSitesShell);
    }
}

