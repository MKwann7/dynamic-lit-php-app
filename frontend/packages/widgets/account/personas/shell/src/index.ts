import { DynLitPersonaShell } from './my-persona-shell';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-persona-shell')) {
        customElements.define('dynlit-my-persona-shell', DynLitPersonaShell);
    }
}
