import { DynLitAdminSitesList } from './admin-sites-list';

export { DynLitAdminSitesList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-admin-sites-list')) {
        customElements.define('dynlit-admin-sites-list', DynLitAdminSitesList);
    }
}

