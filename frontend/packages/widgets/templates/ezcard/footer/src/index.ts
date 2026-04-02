import {EzcardFooter} from './ezcard-footer';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-ezcard-footer')) {
        customElements.define('maxr-ezcard-footer', EzcardFooter);
    }
}