import { MaxrManageImage } from './manage-image';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-manage-image')) {
        customElements.define('maxr-manage-image', MaxrManageImage);
    }
}
