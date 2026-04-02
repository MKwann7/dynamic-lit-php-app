import { MaxrListImages } from './list-images';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-list-images')) {
        customElements.define('maxr-list-images', MaxrListImages);
    }
}
