import { DynLitGroupShell } from './my-group-shell';

export { DynLitGroupShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-group-shell')) {
        customElements.define('dynlit-my-group-shell', DynLitGroupShell);
    }
}
