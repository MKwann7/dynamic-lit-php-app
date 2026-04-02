import { DynLitSiteProfileManage } from './site-profile-manage';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-site-profile-manage')) {
        customElements.define('dynlit-site-profile-manage', DynLitSiteProfileManage);
    }
}
