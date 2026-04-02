import { MaxrSiteThemeSettings } from './site-theme-settings';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-site-theme-settings')) {
        customElements.define('maxr-site-theme-settings', MaxrSiteThemeSettings);
    }
}
