import { MaxrGroup } from './group';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-group')) {
        customElements.define('maxr-group', MaxrGroup);
    }
}