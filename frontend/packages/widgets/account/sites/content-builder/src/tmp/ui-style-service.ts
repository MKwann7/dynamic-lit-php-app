// ============================================================
// ui-style-service.ts  (Phase 6b)
// UIStyleService — reads computed CSS values from builder-chrome probe elements.
//
// Extracted from ContentBuilderHelpers.getUIStyles / getUIStyleValue /
// getFontFamilyStyle / getThemeClass.
//
// Rationale:
//   The legacy code injects a set of invisible "style probe" elements into the
//   builder root, reads their computed styles, and stores the values directly
//   on ContentBuilderRuntime.  This couples theming state to the mutable
//   runtime object and makes it impossible to re-read styles after a theme
//   change without calling getUIStyles() again.
//
//   This service:
//     - Injects temporary probe elements, reads computed styles, then removes
//       the probes immediately — no persistent DOM pollution.
//     - Returns a typed UIStyleSnapshot record instead of mutating shared state.
//     - Exposes a separate getThemeClass() for cases that only need the theme.
//
// Usage:
//   const svc = new UIStyleService(builderRootEl);
//   const styles = svc.readStyles();     // single snapshot
//   const theme  = svc.getThemeClass();  // 'dark' | 'light' | …
// ============================================================

import { DomUtils } from './dom-utils';

// ------------------------------------------------------------------
// Result type
// ------------------------------------------------------------------

export type UITheme = 'dark' | 'colored' | 'colored-dark' | 'light' | 'default';

export interface UIStyleSnapshot {
    // Modal chrome
    modalColor:                        string;
    modalBackground:                   string;

    // Pick-colour button
    buttonPickColorBorder:             string;
    buttonPickColorBackground:         string;

    // General toolbar button
    toolBackground:                    string;
    buttonColor:                       string;
    buttonSvgFill:                     string;
    buttonBackgroundHover:             string;

    // Snippet panel
    snippetColor:                      string;
    snippetBackground:                 string;
    snippetTabsBackground:             string;
    snippetTabItemBackground:          string;
    snippetTabItemBackgroundActive:    string;
    snippetTabItemBackgroundHover:     string;
    snippetTabItemColor:               string;
    snippetMoreItemBackground:         string;
    snippetMoreItemBackgroundActive:   string;
    snippetMoreItemBackgroundHover:    string;
    snippetMoreItemColor:              string;

    // Tab bar
    tabsBackground:                    string;
    tabItemBorderBottomActive:         string;
    tabItemColor:                      string;
    tabsMoreBackground:                string;
    tabsMoreBorder:                    string;
    tabsMoreItemColor:                 string;
    tabsMoreBackgroundHover:           string;

    // Misc form controls
    separatorColor:                    string;
    selectBackground:                  string;
    selectColor:                       string;
    selectOptionBackground:            string;
    inputBackground:                   string;
    inputBorderBottom:                 string;
    inputColor:                        string;
    labelColor:                        string;
    buttonClassicBackground:           string;
    buttonClassicColor:                string;
    buttonClassicBackgroundHover:      string;

    /** Detected theme class from document.body */
    theme: UITheme;
}

// ------------------------------------------------------------------
// Service
// ------------------------------------------------------------------

export class UIStyleService {

    private readonly _dom = new DomUtils();

    constructor(private readonly _uiRoot: HTMLElement) {}

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Probe the builder root for all computed UI style values.
     *
     * Creates temporary invisible helper elements, reads their computed
     * styles via window.getComputedStyle, then removes the elements.
     * Safe to call multiple times — no persistent side effects.
     *
     * Mirrors ContentBuilderHelpers.getUIStyles().
     */
    readStyles(): UIStyleSnapshot {
        const { helper, input, label, select, classicButton, cleanup } = this._injectProbeElements();

        const probe = (el: HTMLElement, cls: string, prop: string): string => {
            this._dom.addClass(el, cls);
            const value = window.getComputedStyle(el).getPropertyValue(prop);
            this._dom.removeClass(el, cls);
            return value;
        };

        const cs = (el: Element, prop: string) =>
            window.getComputedStyle(el).getPropertyValue(prop);

        const snapshot: UIStyleSnapshot = {
            modalColor:                      probe(helper, 'modal-color', 'background-color'),
            modalBackground:                 probe(helper, 'modal-background', 'background-color'),
            buttonPickColorBorder:           probe(helper, 'button-pickcolor-border', 'border'),
            buttonPickColorBackground:       probe(helper, 'button-pickcolor-background', 'background-color'),
            toolBackground:                  cs(helper, 'background-color'),
            buttonColor:                     cs(helper, 'color'),
            buttonSvgFill:                   (() => {
                const svg = helper.querySelector('svg');
                return svg ? cs(svg, 'fill') : '';
            })(),
            buttonBackgroundHover:           probe(helper, 'hover', 'background-color'),
            snippetColor:                    probe(helper, 'snippet-color', 'background-color'),
            snippetBackground:               probe(helper, 'snippet-background', 'background-color'),
            snippetTabsBackground:           probe(helper, 'snippet-tabs-background', 'background-color'),
            snippetTabItemBackground:        probe(helper, 'snippet-tab-item-background', 'background-color'),
            snippetTabItemBackgroundActive:  probe(helper, 'snippet-tab-item-background-active', 'background-color'),
            snippetTabItemBackgroundHover:   probe(helper, 'snippet-tab-item-background-hover', 'background-color'),
            snippetTabItemColor:             probe(helper, 'snippet-tab-item-color', 'background-color'),
            snippetMoreItemBackground:       probe(helper, 'snippet-more-item-background', 'background-color'),
            snippetMoreItemBackgroundActive: probe(helper, 'snippet-more-item-background-active', 'background-color'),
            snippetMoreItemBackgroundHover:  probe(helper, 'snippet-more-item-background-hover', 'background-color'),
            snippetMoreItemColor:            probe(helper, 'snippet-more-item-color', 'background-color'),
            tabsBackground:                  probe(helper, 'tabs-background', 'background-color'),
            tabItemBorderBottomActive:       probe(helper, 'tab-item-active-border-bottom', 'border'),
            tabItemColor:                    probe(helper, 'tab-item-color', 'background-color'),
            tabsMoreBackground:              probe(helper, 'tabs-more-background', 'background-color'),
            tabsMoreBorder:                  probe(helper, 'tabs-more-border', 'border'),
            tabsMoreItemColor:               probe(helper, 'tabs-more-item-color', 'background-color'),
            tabsMoreBackgroundHover:         probe(helper, 'tabs-more-item-background-hover', 'background-color'),
            separatorColor:                  probe(helper, 'separator-color', 'background-color'),
            selectBackground:                cs(select, 'background-color'),
            selectColor:                     cs(select, 'color'),
            selectOptionBackground:          (() => {
                const opt = select.querySelector('option');
                return opt ? cs(opt, 'background-color') : '';
            })(),
            inputBackground:                 cs(input, 'background-color'),
            inputBorderBottom:               cs(input, 'border-bottom'),
            inputColor:                      cs(input, 'color'),
            labelColor:                      cs(label, 'color'),
            buttonClassicBackground:         cs(classicButton, 'background-color'),
            buttonClassicColor:              cs(classicButton, 'color'),
            buttonClassicBackgroundHover:    probe(classicButton, 'hover', 'background-color'),
            theme:                           this._detectTheme(),
        };

        cleanup();
        return snapshot;
    }

    /**
     * Detect the active theme from document.body class names.
     * Mirrors ContentBuilderHelpers.getThemeClass().
     */
    getThemeClass(): UITheme {
        return this._detectTheme();
    }

    // ------------------------------------------------------------------
    // Private
    // ------------------------------------------------------------------

    /**
     * Inject temporary, invisible probe elements into the uiRoot.
     * Returns element references and a `cleanup()` function that removes them.
     */
    private _injectProbeElements(): {
        helper: HTMLElement;
        input: HTMLInputElement;
        label: HTMLLabelElement;
        select: HTMLSelectElement;
        classicButton: HTMLElement;
        cleanup: () => void;
    } {
        const PROBE_STYLE = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;';

        this._uiRoot.insertAdjacentHTML(
            'beforeend',
            `<button class="_cb-style-probe" style="${PROBE_STYLE}"><svg></svg></button>` +
            `<input type="text"  class="_cb-style-probe-input"    style="${PROBE_STYLE}">` +
            `<label             class="_cb-style-probe-label"     style="${PROBE_STYLE}"></label>` +
            `<button            class="_cb-style-probe-classic classic" style="${PROBE_STYLE}"></button>` +
            `<select            class="_cb-style-probe-select"    style="${PROBE_STYLE}"><option></option></select>`,
        );

        const q = <T extends HTMLElement>(sel: string) =>
            this._uiRoot.querySelector<T>(sel)!;

        const helper       = q<HTMLElement>('._cb-style-probe');
        const input        = q<HTMLInputElement>('._cb-style-probe-input');
        const label        = q<HTMLLabelElement>('._cb-style-probe-label');
        const classicButton = q<HTMLElement>('._cb-style-probe-classic');
        const select       = q<HTMLSelectElement>('._cb-style-probe-select');

        const cleanup = () => {
            [helper, input, label, classicButton, select].forEach((el) => {
                el.parentNode?.removeChild(el);
            });
        };

        return { helper, input, label, select, classicButton, cleanup };
    }

    private _detectTheme(): UITheme {
        const bodyClass = document.body.getAttribute('class') ?? '';
        if (bodyClass.includes('colored-dark')) return 'colored-dark';
        if (bodyClass.includes('dark'))         return 'dark';
        if (bodyClass.includes('colored'))      return 'colored';
        if (bodyClass.includes('light'))        return 'light';
        return 'default';
    }
}

