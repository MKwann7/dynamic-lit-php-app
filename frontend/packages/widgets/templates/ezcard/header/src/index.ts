import {EzcardHeader} from './ezcard-header';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-ezcard-header')) {
        customElements.define('dynlit-ezcard-header', EzcardHeader);
    }
}