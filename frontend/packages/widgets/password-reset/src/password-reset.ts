import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-password-reset')
export class DynLitPasswordReset extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Password Reset';

    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        return html`
      <section>
        <h2>${this.title}</h2>
        <p>Password Reset widget loaded.</p>
      </section>
    `;
    }
}