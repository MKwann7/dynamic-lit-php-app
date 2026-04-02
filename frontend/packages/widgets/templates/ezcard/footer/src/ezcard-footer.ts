import { html } from 'lit';
import {customElement, property} from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-ezcard-footer')
export class EzcardFooter extends RuntimeWidgetElement {
    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        return html`<div>Ezcard Footer</div>`;
    }
}