import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-account-dashboard')
export class MaxrAcountDashboard extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Maxr Acount Dashboard';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>Maxr Acount Dashboard</h2>
        <p>Maxr Acount Dashboard widget loaded.</p>
      </section>`;
    }
}
