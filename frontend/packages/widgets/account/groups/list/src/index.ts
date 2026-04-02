import { DynLitMyGroupsList } from './my-groups-list';

export { DynLitMyGroupsList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('dynlit-my-groups-list')) {
        customElements.define('dynlit-my-groups-list', DynLitMyGroupsList);
    }
}
