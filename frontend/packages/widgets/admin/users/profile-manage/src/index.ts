import { DynLitUserProfileManage } from './user-profile-manage';

export { DynLitUserProfileManage };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-user-profile-manage')) {
        customElements.define('dynlit-user-profile-manage', DynLitUserProfileManage);
    }
}

