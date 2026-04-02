import { MaxrMyGroupsList } from './my-groups-list';

export { MaxrMyGroupsList };

export async function defineWidget(): Promise<void> {
    if (!customElements.get('maxr-my-groups-list')) {
        customElements.define('maxr-my-groups-list', MaxrMyGroupsList);
    }
}
