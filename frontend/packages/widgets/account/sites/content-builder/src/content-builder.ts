import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-content-builder')
export class DynLitContentBuilder extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'DynLit Content Builder';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>DynLit Content Builder</h2>
        <p>DynLit Content Builder widget loaded.</p>
      </section>`;
    }
}
