import {EzcardNav} from './ezcard-nav';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-ezcard-nav')) {
        customElements.define('dynlit-ezcard-nav', EzcardNav);
    }
}