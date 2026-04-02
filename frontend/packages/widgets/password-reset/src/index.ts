import { MaxrPasswordReset } from './password-reset';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-password-reset')) {
        customElements.define('maxr-password-reset', MaxrPasswordReset);
    }
}