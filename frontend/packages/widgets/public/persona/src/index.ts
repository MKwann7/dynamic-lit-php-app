import { DynLitPersona } from './persona';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-persona')) {
        customElements.define('dynlit-persona', DynLitPersona);
    }
}