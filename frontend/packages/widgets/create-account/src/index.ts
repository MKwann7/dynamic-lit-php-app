import {MaxrCreateAccount} from './create-account';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-create-account')) {
        customElements.define('maxr-create-account', MaxrCreateAccount);
    }
}