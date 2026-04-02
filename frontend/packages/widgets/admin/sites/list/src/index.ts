import { MaxrAdminSitesList } from './admin-sites-list';

export { MaxrAdminSitesList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-admin-sites-list')) {
        customElements.define('maxr-admin-sites-list', MaxrAdminSitesList);
    }
}

