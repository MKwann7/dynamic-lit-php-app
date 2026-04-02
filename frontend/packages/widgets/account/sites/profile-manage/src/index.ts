import { MaxrSiteProfileManage } from './site-profile-manage';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-site-profile-manage')) {
        customElements.define('maxr-site-profile-manage', MaxrSiteProfileManage);
    }
}
