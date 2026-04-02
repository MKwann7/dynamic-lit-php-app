import { DynLitLoginAuth } from './login';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-login')) {
        customElements.define('dynlit-login', DynLitLoginAuth);
    }
}