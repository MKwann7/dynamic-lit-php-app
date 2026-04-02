import { DynLitUsersShell } from './users-shell';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-users-shell')) {
        customElements.define('dynlit-users-shell', DynLitUsersShell);
    }
}
