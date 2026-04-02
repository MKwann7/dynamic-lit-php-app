import { DynLitMyPersonasList } from './my-personas-list';

export { DynLitMyPersonasList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-personas-list')) {
        customElements.define('dynlit-my-personas-list', DynLitMyPersonasList);
    }
}
