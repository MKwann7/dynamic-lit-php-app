import { MaxrMyPersonasList } from './my-personas-list';

export { MaxrMyPersonasList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-personas-list')) {
        customElements.define('maxr-my-personas-list', MaxrMyPersonasList);
    }
}
