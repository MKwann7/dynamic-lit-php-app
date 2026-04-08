import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-site-builder')
export class DynLitSiteBuilder extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'DynLit Site Builder';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>DynLit Site Builder</h2>
        <p>DynLit Site Builder widget loaded.</p>
      </section>`;
    }
}
