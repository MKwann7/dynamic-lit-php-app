import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-password-reset')
export class MaxrPasswordReset extends RuntimeWidgetElement {
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