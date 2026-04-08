import { DynLitContentBuilder } from './content-builder';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-content-builder')) {
        customElements.define('dynlit-content-builder', DynLitContentBuilder);
    }
}
