import { MaxrPersonaShell } from './my-persona-shell';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-persona-shell')) {
        customElements.define('maxr-my-persona-shell', MaxrPersonaShell);
    }
}
