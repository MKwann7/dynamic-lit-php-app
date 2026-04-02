import { MaxrAdminSitesShell } from './admin-sites-shell';

export { MaxrAdminSitesShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-admin-sites-shell')) {
        customElements.define('maxr-admin-sites-shell', MaxrAdminSitesShell);
    }
}

