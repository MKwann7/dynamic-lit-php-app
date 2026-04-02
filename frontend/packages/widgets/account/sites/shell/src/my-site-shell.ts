import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-my-site-shell')
export class DynLitSiteShell extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'DynLit Site Shell';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>DynLit Site Shell</h2>
        <p>DynLit Site Shell widget loaded.</p>
      </section>`;
    }
}
