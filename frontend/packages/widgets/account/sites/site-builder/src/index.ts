import { DynLitSiteBuilder } from './site-builder';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-site-builder')) {
        customElements.define('dynlit-site-builder', DynLitSiteBuilder);
    }
}
