import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-account-dashboard')
export class DynLitAcountDashboard extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'DynLit Acount Dashboard';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>DynLit Acount Dashboard</h2>
        <p>DynLit Acount Dashboard widget loaded.</p>
      </section>`;
    }
}
