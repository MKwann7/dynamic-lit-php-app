import { MaxrMyProfileDropdown } from './my-profile-dropdown';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-profile-dropdown')) {
        customElements.define('maxr-my-profile-dropdown', MaxrMyProfileDropdown);
    }
}
