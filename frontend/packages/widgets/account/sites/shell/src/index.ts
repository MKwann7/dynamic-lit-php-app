import { DynLitSiteShell } from './my-site-shell';

export { DynLitSiteShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-site-shell')) {
        customElements.define('dynlit-my-site-shell', DynLitSiteShell);
    }
}
