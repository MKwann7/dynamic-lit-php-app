import { MaxrGroupShell } from './my-group-shell';

export { MaxrGroupShell };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-group-shell')) {
        customElements.define('maxr-my-group-shell', MaxrGroupShell);
    }
}
