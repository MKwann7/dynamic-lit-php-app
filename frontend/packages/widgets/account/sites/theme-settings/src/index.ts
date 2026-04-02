import { DynLitSiteThemeSettings } from './site-theme-settings';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-site-theme-settings')) {
        customElements.define('dynlit-site-theme-settings', DynLitSiteThemeSettings);
    }
}
