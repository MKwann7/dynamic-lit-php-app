import { DynLitSiteUserManage } from './site-user-manage';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-site-user-manage')) {
        customElements.define('dynlit-site-user-manage', DynLitSiteUserManage);
    }
}
