import {EzcardHeader} from './ezcard-header';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-ezcard-header')) {
        customElements.define('maxr-ezcard-header', EzcardHeader);
    }
}