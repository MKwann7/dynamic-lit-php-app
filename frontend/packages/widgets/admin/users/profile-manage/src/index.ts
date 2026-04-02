import { MaxrUserProfileManage } from './user-profile-manage';

export { MaxrUserProfileManage };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-user-profile-manage')) {
        customElements.define('maxr-user-profile-manage', MaxrUserProfileManage);
    }
}

