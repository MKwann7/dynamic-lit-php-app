// ============================================================
// page-document-model.ts  (Phase 5)
// Structured page/block model for the modernized content builder.
//
// Migration intent:
//   The legacy system used raw HTML as the only source of truth.
//   This model introduces a typed intermediate representation so that:
//     – Native content blocks can still carry HTML for rich-text, but
//       it is collected from the live DOM on serialize(), not stored blindly.
//     – Managed component blocks carry structured props and a server-assigned
//       componentInstanceUuid. They NEVER use raw DOM HTML as their truth.
//
//   Identity model — keep these three identities strictly separate:
//     blockUuid              page block identity (unique within the page)
//     componentTypeId        component type definition identity
//     componentInstanceUuid  server-assigned instance identity (after registration)
// ============================================================

// ------------------------------------------------------------------
// Discriminator types
// ------------------------------------------------------------------

export type BlockKind = 'native-layout' | 'native-content' | 'managed-component';

export type NativeContentType =
    | 'rich-text'   // inline-editable HTML content
    | 'image'       // img block with src/alt
    | 'heading'     // h1–h6 text
    | 'divider'     // <hr> or styled separator
    | 'spacer'      // empty vertical space
    | 'code'        // pre/code block
    | 'button';     // CTA button

export type ComponentCategory = 'built-in' | 'api-discovered';

// ------------------------------------------------------------------
// Block capabilities
// Describes what editor operations a block supports.
// ------------------------------------------------------------------

export interface BlockCapabilities {
    canEditInline: boolean;
    canResizeColumns: boolean;
    canDelete: boolean;
    canMove: boolean;
    canStyleColumns: boolean;
    /** True for managed component blocks — activates a component-specific editor panel */
    usesComponentEditor: boolean;
}

const DEFAULT_CAPABILITIES: BlockCapabilities = {
    canEditInline: false,
    canResizeColumns: false,
    canDelete: true,
    canMove: true,
    canStyleColumns: false,
    usesComponentEditor: false,
};

// ------------------------------------------------------------------
// Base block — all blocks share these fields
// ------------------------------------------------------------------

interface BaseBlock {
    blockUuid: string;
    kind: BlockKind;
    capabilities: BlockCapabilities;
}

// ------------------------------------------------------------------
// Native layout block (Lane A)
// A row that holds 1–4 columns.
// Each column contains an ordered list of content or component blocks.
// ------------------------------------------------------------------

export interface NativeLayoutColumn {
    colUuid: string;
    /** CSS class names applied to this column (e.g. col-6, col-12) */
    styleClasses: string[];
    blocks: ColumnBlock[];
}

export interface NativeLayoutBlock extends BaseBlock {
    kind: 'native-layout';
    columnCount: 1 | 2 | 3 | 4;
    columns: NativeLayoutColumn[];
    /** CSS class names applied to the row element */
    rowStyleClasses: string[];
}

// ------------------------------------------------------------------
// Native content block (Lane A — content primitives)
// Most fields are optional because they apply to specific contentTypes.
// ------------------------------------------------------------------

export interface NativeContentBlock extends BaseBlock {
    kind: 'native-content';
    contentType: NativeContentType;

    /** Rich-text HTML body. Valid only when contentType === 'rich-text'.
     *  On serialize(), this is collected from the live DOM, not stored blindly. */
    html?: string;

    /** Image src URL. Valid only when contentType === 'image'. */
    src?: string;

    /** Image alt text. */
    alt?: string;

    /** Heading level. Valid only when contentType === 'heading'. */
    level?: 1 | 2 | 3 | 4 | 5 | 6;

    /** Text content for headings and buttons. */
    text?: string;

    /** Button or image link href. */
    href?: string;

    /** CSS class names applied to this block element */
    styleClasses: string[];
}

// ------------------------------------------------------------------
// Managed component block (Lane B)
// Dynamic Lit-based widgets. These blocks do NOT use raw HTML as their
// source of truth. Props are the canonical representation.
//
// componentInstanceUuid is absent until the block has been registered
// with the API. Check for its presence before making API calls.
// ------------------------------------------------------------------

export interface ManagedComponentBlock extends BaseBlock {
    kind: 'managed-component';

    /** Type definition identity — which kind of component this is */
    componentTypeId: string;

    /** Server-assigned per-instance identity.
     *  Absent until the registration API call has been made. */
    componentInstanceUuid?: string;

    /** Component-specific settings / props. Serialized as JSON. */
    props: Record<string, unknown>;

    /** CSS class names applied to the wrapper element */
    styleClasses: string[];
}

// ------------------------------------------------------------------
// Component type definition
// Describes a component type that can be placed on a page.
// Built-in types come from a local registry.
// API-discovered types are fetched at editor startup.
// ------------------------------------------------------------------

export interface ComponentTypeDefinition {
    componentTypeId: string;
    name: string;
    description?: string;
    category: ComponentCategory;
    iconUrl?: string;

    /**
     * When true, dropping this block onto the page must trigger a POST to the
     * registration API before the block is committed to the document.
     * The registration response provides componentInstanceUuid.
     */
    requiresRegistration: boolean;

    /** Default props applied when creating a new block of this type */
    defaultProps: Record<string, unknown>;
}

// ------------------------------------------------------------------
// Component instance record
// Tracks server-backed component instance metadata for a placed block.
// ------------------------------------------------------------------

export interface ComponentInstanceRecord {
    /** Server-assigned — set after registration API call */
    componentInstanceUuid: string;
    componentTypeId: string;
    /** The page block that owns this instance */
    blockUuid: string;
    /** ISO 8601 timestamp set by the API */
    registeredAt: string;
    settings: Record<string, unknown>;
}

// ------------------------------------------------------------------
// Union types
// ------------------------------------------------------------------

export type AnyBlock = NativeLayoutBlock | NativeContentBlock | ManagedComponentBlock;

/** The subset of block types that can live inside a layout column */
export type ColumnBlock = NativeContentBlock | ManagedComponentBlock;

// ------------------------------------------------------------------
// Top-level page document
// ------------------------------------------------------------------

export interface PageDocument {
    pageId: string;

    /** Monotonically incremented each time serialize() is called */
    version: number;

    /**
     * Top-level block list. Typically NativeLayoutBlocks.
     * Flat NativeContentBlocks may appear here in simple page structures.
     */
    blocks: AnyBlock[];

    /**
     * Map of all managed component instances on the page, keyed by
     * componentInstanceUuid for O(1) lookup and clean serialization.
     */
    componentInstances: Record<string, ComponentInstanceRecord>;

    createdAt?: string;
    updatedAt?: string;
}

// ------------------------------------------------------------------
// Utility: UUID generation
// Matches the makeId() behavior from ContentBuilderHelpers.
// ------------------------------------------------------------------

export function makeBlockUuid(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const alphaNum = letters + '0123456789';
    let id = '';
    for (let i = 0; i < 2; i++) id += letters[Math.floor(Math.random() * letters.length)];
    for (let i = 0; i < 9; i++) id += alphaNum[Math.floor(Math.random() * alphaNum.length)];
    return id;
}

export function makeColUuid(): string {
    return `col-${makeBlockUuid()}`;
}

// ------------------------------------------------------------------
// Utility: Empty document factory
// ------------------------------------------------------------------

export function emptyPageDocument(pageId: string): PageDocument {
    return {
        pageId,
        version: 0,
        blocks: [],
        componentInstances: {},
        createdAt: new Date().toISOString(),
    };
}

// ------------------------------------------------------------------
// Utility: Default capabilities factories
// ------------------------------------------------------------------

export function nativeLayoutCapabilities(): BlockCapabilities {
    return { ...DEFAULT_CAPABILITIES, canResizeColumns: true, canStyleColumns: true };
}

export function nativeContentCapabilities(contentType: NativeContentType): BlockCapabilities {
    const canEditInline = contentType !== 'divider' && contentType !== 'spacer';
    return { ...DEFAULT_CAPABILITIES, canEditInline };
}

export function managedComponentCapabilities(): BlockCapabilities {
    return {
        ...DEFAULT_CAPABILITIES,
        canEditInline: false,
        canResizeColumns: false,
        usesComponentEditor: true,
    };
}

// ------------------------------------------------------------------
// Utility: Block factories
// ------------------------------------------------------------------

export function makeNativeLayoutBlock(columnCount: NativeLayoutBlock['columnCount'] = 1): NativeLayoutBlock {
    const columns: NativeLayoutColumn[] = Array.from({ length: columnCount }, () => ({
        colUuid: makeColUuid(),
        styleClasses: [],
        blocks: [],
    }));
    return {
        blockUuid: makeBlockUuid(),
        kind: 'native-layout',
        columnCount,
        columns,
        rowStyleClasses: [],
        capabilities: nativeLayoutCapabilities(),
    };
}

export function makeNativeContentBlock(contentType: NativeContentType): NativeContentBlock {
    return {
        blockUuid: makeBlockUuid(),
        kind: 'native-content',
        contentType,
        styleClasses: [],
        capabilities: nativeContentCapabilities(contentType),
    };
}

export function makeManagedComponentBlock(
    componentTypeId: string,
    defaultProps: Record<string, unknown> = {},
): ManagedComponentBlock {
    return {
        blockUuid: makeBlockUuid(),
        kind: 'managed-component',
        componentTypeId,
        props: { ...defaultProps },
        styleClasses: [],
        capabilities: managedComponentCapabilities(),
    };
}

