import { DynLitManageImage } from './manage-image';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-manage-image')) {
        customElements.define('dynlit-manage-image', DynLitManageImage);
    }
}
