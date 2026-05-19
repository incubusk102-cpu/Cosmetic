/**
 * Hand-written types for the MVP. Replace later with the generated output of:
 *   supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts
 *
 * The shape matches @supabase/postgrest-js's `GenericSchema`:
 * each table needs `Row`, `Insert`, `Update`, `Relationships`, and the schema
 * needs `Tables`, `Views`, `Functions`.
 */
export type Verdict = "safe" | "caution" | "avoid";
export type ProductSource = "barcode" | "ocr" | "manual";
export type Plan = "free" | "plus";

type EmptyRelationships = [];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          plan: Plan;
          pdf_exports_used_this_month: number;
          region: string | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          plan?: Plan;
          region?: string | null;
          pdf_exports_used_this_month?: number;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          plan?: Plan;
          region?: string | null;
          pdf_exports_used_this_month?: number;
        };
        Relationships: EmptyRelationships;
      };
      user_allergens: {
        Row: {
          id: string;
          user_id: string;
          allergen_key: string | null;
          custom_label: string | null;
          severity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          allergen_key?: string | null;
          custom_label?: string | null;
          severity?: number;
        };
        Update: {
          allergen_key?: string | null;
          custom_label?: string | null;
          severity?: number;
        };
        Relationships: EmptyRelationships;
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          barcode: string | null;
          brand: string | null;
          name: string | null;
          source: ProductSource;
          ingredients_raw: string | null;
          scanned_at: string;
          is_saved: boolean;
          last_verdict: Verdict | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          barcode?: string | null;
          brand?: string | null;
          name?: string | null;
          source: ProductSource;
          ingredients_raw?: string | null;
          is_saved?: boolean;
          last_verdict?: Verdict | null;
        };
        Update: {
          barcode?: string | null;
          brand?: string | null;
          name?: string | null;
          source?: ProductSource;
          ingredients_raw?: string | null;
          is_saved?: boolean;
          last_verdict?: Verdict | null;
        };
        Relationships: EmptyRelationships;
      };
      reactions: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          severity: number;
          body_area: string | null;
          symptoms: string[] | null;
          notes: string | null;
          photo_path: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          severity: number;
          body_area?: string | null;
          symptoms?: string[] | null;
          notes?: string | null;
          photo_path?: string | null;
        };
        Update: {
          product_id?: string | null;
          severity?: number;
          body_area?: string | null;
          symptoms?: string[] | null;
          notes?: string | null;
          photo_path?: string | null;
        };
        Relationships: EmptyRelationships;
      };
      product_cache: {
        Row: {
          barcode: string;
          brand: string | null;
          name: string | null;
          ingredients_raw: string | null;
          fetched_at: string;
          source: string;
        };
        Insert: {
          barcode: string;
          brand?: string | null;
          name?: string | null;
          ingredients_raw?: string | null;
          source?: string;
        };
        Update: {
          brand?: string | null;
          name?: string | null;
          ingredients_raw?: string | null;
          source?: string;
        };
        Relationships: EmptyRelationships;
      };
      scan_events: {
        Row: {
          id: number;
          user_id: string | null;
          kind: string;
          meta: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          kind: string;
          meta?: Record<string, unknown> | null;
        };
        Update: {
          kind?: string;
          meta?: Record<string, unknown> | null;
        };
        Relationships: EmptyRelationships;
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
}
