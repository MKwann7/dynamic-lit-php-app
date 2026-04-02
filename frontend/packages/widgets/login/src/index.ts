import { MaxrLoginAuth } from './login';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-login')) {
        customElements.define('maxr-login', MaxrLoginAuth);
    }
}