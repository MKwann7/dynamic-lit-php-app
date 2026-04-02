import { MaxrSiteShell } from './my-site-shell';

export { MaxrSiteShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-site-shell')) {
        customElements.define('maxr-my-site-shell', MaxrSiteShell);
    }
}
