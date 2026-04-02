import {EzcardFooter} from './ezcard-footer';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-ezcard-footer')) {
        customElements.define('dynlit-ezcard-footer', EzcardFooter);
    }
}