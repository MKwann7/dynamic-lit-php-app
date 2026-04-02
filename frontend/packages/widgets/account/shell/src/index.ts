import { DynLitAccountShell } from './account';

export { DynLitAccountShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-account-shell')) {
        customElements.define('dynlit-account-shell', DynLitAccountShell);
    }
}

