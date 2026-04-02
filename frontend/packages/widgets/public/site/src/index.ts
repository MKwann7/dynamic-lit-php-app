import {DynLitSite} from "./site";

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-site')) {
        customElements.define('dynlit-site', DynLitSite);
    }
}