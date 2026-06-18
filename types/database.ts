export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      listing_discount_rules: {
        Row: {
          apply_order: number
          created_at: string
          fixed_amount: number | null
          id: string
          is_active: boolean
          label: string
          listing_id: string
          percent: number | null
          rule_type: Database["public"]["Enums"]["discount_rule_type"]
        }
        Insert: {
          apply_order?: number
          created_at?: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          label: string
          listing_id: string
          percent?: number | null
          rule_type: Database["public"]["Enums"]["discount_rule_type"]
        }
        Update: {
          apply_order?: number
          created_at?: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          label?: string
          listing_id?: string
          percent?: number | null
          rule_type?: Database["public"]["Enums"]["discount_rule_type"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_discount_rules_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_discount_rules_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_product_price_comparison"
            referencedColumns: ["listing_id"]
          },
        ]
      }
      product_listings: {
        Row: {
          created_at: string
          id: string
          in_stock: boolean
          last_checked_at: string | null
          product_number: string
          product_url: string | null
          retailer_id: string
          sale_price: number
          shipping_fee: number
        }
        Insert: {
          created_at?: string
          id?: string
          in_stock?: boolean
          last_checked_at?: string | null
          product_number: string
          product_url?: string | null
          retailer_id: string
          sale_price: number
          shipping_fee?: number
        }
        Update: {
          created_at?: string
          id?: string
          in_stock?: boolean
          last_checked_at?: string | null
          product_number?: string
          product_url?: string | null
          retailer_id?: string
          sale_price?: number
          shipping_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_listings_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "product_listings_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_inventory_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "product_listings_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_margin_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "product_listings_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_bom_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "product_listings_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_catalog"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "product_listings_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_price_comparison"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "product_listings_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_listings_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "v_product_price_comparison"
            referencedColumns: ["retailer_id"]
          },
        ]
      }
      products: {
        Row: {
          catalog_set_num: string | null
          created_at: string
          image_url: string | null
          msrp: number
          name: string
          notes: string | null
          product_number: string
          release_date: string | null
          status: Database["public"]["Enums"]["product_status"]
          theme_id: string | null
          updated_at: string
        }
        Insert: {
          catalog_set_num?: string | null
          created_at?: string
          image_url?: string | null
          msrp: number
          name: string
          notes?: string | null
          product_number: string
          release_date?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          theme_id?: string | null
          updated_at?: string
        }
        Update: {
          catalog_set_num?: string | null
          created_at?: string
          image_url?: string | null
          msrp?: number
          name?: string
          notes?: string | null
          product_number?: string
          release_date?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          theme_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      retailers: {
        Row: {
          base_url: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          base_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      sales_records: {
        Row: {
          created_at: string
          external_order_id: string | null
          id: string
          import_source: string | null
          memo: string | null
          platform_fee_rate: number
          product_number: string
          quantity: number
          retailer_id: string | null
          shipping_out_cost: number
          sold_at: string
          unit_sale_price: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          external_order_id?: string | null
          id?: string
          import_source?: string | null
          memo?: string | null
          platform_fee_rate?: number
          product_number: string
          quantity: number
          retailer_id?: string | null
          shipping_out_cost?: number
          sold_at?: string
          unit_sale_price: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          external_order_id?: string | null
          id?: string
          import_source?: string | null
          memo?: string | null
          platform_fee_rate?: number
          product_number?: string
          quantity?: number
          retailer_id?: string | null
          shipping_out_cost?: number
          sold_at?: string
          unit_sale_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sales_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_inventory_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sales_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_margin_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sales_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_bom_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sales_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_catalog"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sales_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_price_comparison"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sales_records_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_records_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "v_product_price_comparison"
            referencedColumns: ["retailer_id"]
          },
        ]
      }
      sourcing_records: {
        Row: {
          created_at: string
          effective_price_paid: number | null
          id: string
          memo: string | null
          product_number: string
          purchased_at: string
          quantity: number
          retailer_id: string | null
          source_note: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          effective_price_paid?: number | null
          id?: string
          memo?: string | null
          product_number: string
          purchased_at?: string
          quantity: number
          retailer_id?: string | null
          source_note?: string | null
          unit_cost: number
        }
        Update: {
          created_at?: string
          effective_price_paid?: number | null
          id?: string
          memo?: string | null
          product_number?: string
          purchased_at?: string
          quantity?: number
          retailer_id?: string | null
          source_note?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_inventory_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_margin_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_bom_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_catalog"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_price_comparison"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_records_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "v_product_price_comparison"
            referencedColumns: ["retailer_id"]
          },
        ]
      }
      themes: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_inventory_summary: {
        Row: {
          avg_cost: number | null
          current_stock: number | null
          msrp: number | null
          name: string | null
          product_number: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          stock_value: number | null
          total_sold: number | null
          total_sourced: number | null
        }
        Relationships: []
      }
      v_margin_summary: {
        Row: {
          msrp: number | null
          name: string | null
          net_profit: number | null
          product_number: string | null
          roi_pct: number | null
          total_cost_basis: number | null
          total_platform_fee: number | null
          total_revenue: number | null
          total_shipping_out: number | null
          total_sold: number | null
        }
        Relationships: []
      }
      v_product_bom_summary: {
        Row: {
          catalog_inventory_id: number | null
          catalog_set_num: string | null
          minifig_lines: number | null
          part_lines: number | null
          product_number: string | null
          spare_lines: number | null
          sub_set_lines: number | null
        }
        Relationships: []
      }
      v_product_catalog: {
        Row: {
          catalog_inventory_id: number | null
          catalog_inventory_version: number | null
          catalog_num_parts: number | null
          catalog_set_name: string | null
          catalog_set_num: string | null
          catalog_theme_id: number | null
          catalog_theme_name: string | null
          catalog_year: number | null
          msrp: number | null
          product_name: string | null
          product_number: string | null
          release_date: string | null
          resell_theme_id: string | null
          resell_theme_name: string | null
          status: Database["public"]["Enums"]["product_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "products_theme_id_fkey"
            columns: ["resell_theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_product_price_comparison: {
        Row: {
          breakdown: Json | null
          effective_price: number | null
          effective_vs_msrp_pct: number | null
          in_stock: boolean | null
          last_checked_at: string | null
          listing_id: string | null
          msrp: number | null
          product_name: string | null
          product_number: string | null
          product_status: Database["public"]["Enums"]["product_status"] | null
          product_url: string | null
          retailer_id: string | null
          retailer_logo_url: string | null
          retailer_name: string | null
          retailer_slug: string | null
          sale_price: number | null
          savings_vs_msrp: number | null
          shipping_fee: number | null
        }
        Relationships: []
      }
      v_purchase_history: {
        Row: {
          created_at: string | null
          effective_price_paid: number | null
          id: string | null
          memo: string | null
          msrp: number | null
          product_name: string | null
          product_number: string | null
          purchased_at: string | null
          quantity: number | null
          retailer_id: string | null
          retailer_name: string | null
          source_note: string | null
          total_cost: number | null
          total_effective_cost: number | null
          unit_cost: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_inventory_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_margin_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_bom_summary"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_catalog"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_product_number_fkey"
            columns: ["product_number"]
            isOneToOne: false
            referencedRelation: "v_product_price_comparison"
            referencedColumns: ["product_number"]
          },
          {
            foreignKeyName: "sourcing_records_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_records_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "v_product_price_comparison"
            referencedColumns: ["retailer_id"]
          },
        ]
      }
    }
    Functions: {
      calculate_effective_price: {
        Args: { p_rules?: Json; p_sale_price: number; p_shipping: number }
        Returns: {
          breakdown: Json
          effective_price: number
        }[]
      }
      resolve_catalog_set_num: {
        Args: { p_catalog_set_num: string; p_product_number: string }
        Returns: string
      }
    }
    Enums: {
      discount_rule_type: "instant" | "card_charge" | "cashback" | "other"
      product_status: "on_sale" | "retiring_soon" | "discontinued"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      discount_rule_type: ["instant", "card_charge", "cashback", "other"],
      product_status: ["on_sale", "retiring_soon", "discontinued"],
    },
  },
} as const

