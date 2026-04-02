import { MaxrSiteUserManage } from './site-user-manage';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-site-user-manage')) {
        customElements.define('maxr-site-user-manage', MaxrSiteUserManage);
    }
}
