export type AddContentMode = 'cell' | 'cell-left' | 'cell-right' | 'row' | 'elm';

/**
 * Legacy IE-era text range. Not present in modern browser DOM typings.
 * Preserved here as a migration shim for ContentBuilderHelpers.saveSelection /
 * restoreSelection until those paths are replaced by SelectionManager.
 * @legacy
 */
export interface TextRange {
    select(): void;
    collapse(start?: boolean): void;
    setEndPoint(type: string, range: TextRange): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export interface BuilderUndoManager {
    saveForUndo(): void;
}

export interface BuilderMoveable {
    updateRect(): void;
}

export interface BuilderRte {
    positionToolbar(): void;
    rteFontFamilyOptions?: HTMLElement;
}

export interface BuilderColumnTool {
    lockIndicator: HTMLElement;
}

export interface BuilderOptions {
    lang: Record<string, string>;
    animateModal?: boolean;
    zoom: number;
    container: string;
    row: string;
    cols: string[];
    colequal: string[][];
    rowFormat: string;
    cellFormat: string;
    checkLang?: boolean;
    onAdd?: (html: string) => string;
    onChange: () => void;
}

export interface ContentBuilderRuntime {
    opts: BuilderOptions;
    builderStuff: HTMLElement;
    uo: BuilderUndoManager;
    moveable: BuilderMoveable;
    rte: BuilderRte;

    maxColumns?: number;
    selection?: Range[] | TextRange | null;
    activeElement: HTMLElement | null;
    activeCol: HTMLElement | null;
    activeSpacer: HTMLElement | null;
    activeCodeBlock: HTMLElement | null;
    activeLink: HTMLElement | null;
    activeIframe: HTMLElement | null;
    activeTd: HTMLElement | null;
    activeTable: HTMLElement | null;
    activeModule: HTMLElement | null;
    activeImage?: HTMLElement | null;
    activeIcon: HTMLElement | null;
    inspectedElement: HTMLElement | null;
    activeButton?: HTMLElement | null;
    styleModalColor?: string;
    styleModalBackground?: string;
    styleButtonPickColorBorder?: string;
    styleButtonPickColorBackground?: string;
    styleToolBackground?: string;
    styleButtonColor?: string;
    styleButtonSvgFill?: string;
    styleButtonBackgroundHover?: string;
    styleSnippetColor?: string;
    styleSnippetBackground?: string;
    styleSnippetTabsBackground?: string;
    styleSnippetTabItemBackground?: string;
    styleSnippetTabItemBackgroundActive?: string;
    styleSnippetTabItemBackgroundHover?: string;
    styleSnippetTabItemColor?: string;
    styleSnippetMoreItemBackground?: string;
    styleSnippetMoreItemBackgroundActive?: string;
    styleSnippetMoreItemBackgroundHover?: string;
    styleSnippetMoreItemColor?: string;
    styleTabsBackground?: string;
    styleTabItemBorderBottomActive?: string;
    styleTabItemColor?: string;
    styleTabsMoreBackground?: string;
    styleTabsMoreBorder?: string;
    styleTabsMoreItemColor?: string;
    styleTabsMoreBackgroundHover?: string;
    styleSeparatorColor?: string;
    styleSelectBackground?: string;
    styleSelectColor?: string;
    styleSelectOptionBackground?: string;
    styleInputBackground?: string;
    styleInputBorderBottom?: string;
    styleInputColor?: string;
    styleLabelColor?: string;
    styleButtonClassicBackground?: string;
    styleButtonClassicColor?: string;
    styleButtonClassicBackgroundHover?: string;
    styleDark?: boolean;
    styleColored?: boolean;
    styleColoredDark?: boolean;
    styleLight?: boolean;
    fontAssetPath?: string;
    colTool?: BuilderColumnTool;
    isTouchSupport?: boolean;

    applyBehavior(): void;
}
