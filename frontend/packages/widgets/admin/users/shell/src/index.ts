import { MaxrUsersShell } from './users-shell';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-users-shell')) {
        customElements.define('maxr-users-shell', MaxrUsersShell);
    }
}
