import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-my-persona-dashboard')
export class DynLitPersonaDashboard extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'DynLit Persona Dashboard';

    @state()
    private siteUuid: string | null = null;

    connectedCallback() {
        super.connectedCallback();
        // Read the UUID from the routing context — set by the manager when this
        // component was mounted via a dep with path: "{uuid}"
        this.siteUuid = this.getRouteParam('uuid');
    }

    render() {
        return html`
        <section>
            <h2>DynLit Persona Dashboard</h2>
            ${this.siteUuid
                ? html`<p>Site UUID: <code>${this.siteUuid}</code></p>`
                : html`<p>No site selected.</p>`
            }
        </section>`;
    }
}
