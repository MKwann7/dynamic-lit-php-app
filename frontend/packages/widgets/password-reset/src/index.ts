import { DynLitPasswordReset } from './password-reset';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-password-reset')) {
        customElements.define('dynlit-password-reset', DynLitPasswordReset);
    }
}