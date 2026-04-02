import { DynLitGroup } from './group';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-group')) {
        customElements.define('dynlit-group', DynLitGroup);
    }
}