import { MaxrAccountShell } from './account';

export { MaxrAccountShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-account-shell')) {
        customElements.define('maxr-account-shell', MaxrAccountShell);
    }
}

