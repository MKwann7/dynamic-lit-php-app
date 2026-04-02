import { MaxrPersona } from './persona';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-persona')) {
        customElements.define('maxr-persona', MaxrPersona);
    }
}