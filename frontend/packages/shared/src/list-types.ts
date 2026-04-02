import type { TemplateResult } from 'lit';

/**
 * Describes a single field on the entity record.
 *
 * Serves three purposes:
 *  1. Rendering  — drives which columns appear in list/card view
 *  2. Search     — fields with searchable:true are sent as ?search_fields=...
 *                  so the backend knows which columns to LIKE-match
 *  3. Formatting — optional per-value formatter for display
 */
export interface FieldDef<T> {
    /** Key on the data object */
    key: keyof T & string;

    /** Column header / card label */
    label: string;

    /**
     * Include this field in the ?search_fields= hint sent to the backend.
     * The backend reads this to limit its LIKE search to specific columns.
     */
    searchable?: boolean;

    /** Show this field on the grid card (default: true) */
    card?: boolean;

    /** Show this field as a table column in list view (default: true) */
    list?: boolean;

    /** Apply text-truncate styling to long values */
    truncate?: boolean;

    /**
     * Optional custom formatter.
     * Return a plain string or a Lit TemplateResult (e.g. a badge).
     */
    format?: (value: unknown, item: T) => string | TemplateResult;
}

/** One entry in the filter dropdown */
export interface FilterDef {
    value: string;
    label: string;
}

/** Standard API list-response envelope */
export interface ListApiResponse<T> {
    success: boolean;
    data: T[];
    meta: {
        page:    number;
        pages:   number;
        total:   number;
        perPage: number;
    };
}

