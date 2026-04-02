import {EzcardNav} from './ezcard-nav';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-ezcard-nav')) {
        customElements.define('maxr-ezcard-nav', EzcardNav);
    }
}