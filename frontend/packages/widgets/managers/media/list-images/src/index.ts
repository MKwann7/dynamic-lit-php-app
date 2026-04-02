import { DynLitListImages } from './list-images';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-list-images')) {
        customElements.define('dynlit-list-images', DynLitListImages);
    }
}
