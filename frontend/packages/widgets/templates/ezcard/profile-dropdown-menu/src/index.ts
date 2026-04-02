import { DynLitMyProfileDropdown } from './my-profile-dropdown';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-profile-dropdown')) {
        customElements.define('dynlit-my-profile-dropdown', DynLitMyProfileDropdown);
    }
}
