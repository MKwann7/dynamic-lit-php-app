import {DynLitCreateAccount} from './create-account';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-create-account')) {
        customElements.define('dynlit-create-account', DynLitCreateAccount);
    }
}