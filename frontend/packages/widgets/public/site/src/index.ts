import {MaxrSite} from "./site";

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-site')) {
        customElements.define('maxr-site', MaxrSite);
    }
}