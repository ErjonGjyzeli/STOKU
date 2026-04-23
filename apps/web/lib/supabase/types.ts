export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      company_settings: {
        Row: {
          address_line1: string | null
          bank_name: string | null
          city: string | null
          country: string | null
          created_at: string | null
          default_tax_rate: number | null
          email: string | null
          iban: string | null
          id: number
          invoice_footer: string | null
          legal_name: string
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          tax_code: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          address_line1?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_tax_rate?: number | null
          email?: string | null
          iban?: string | null
          id?: number
          invoice_footer?: string | null
          legal_name?: string
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_code?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          address_line1?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_tax_rate?: number | null
          email?: string | null
          iban?: string | null
          id?: number
          invoice_footer?: string | null
          legal_name?: string
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_code?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address_line1: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          tax_code: string | null
          type: string
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_code?: string | null
          type: string
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_code?: string | null
          type?: string
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          change: number
          created_at: string | null
          from_store_id: number | null
          id: number
          notes: string | null
          product_id: string | null
          reason: string
          reference_order_id: string | null
          staff_id: string | null
          store_id: number | null
          to_store_id: number | null
          transfer_id: string | null
        }
        Insert: {
          change: number
          created_at?: string | null
          from_store_id?: number | null
          id?: number
          notes?: string | null
          product_id?: string | null
          reason: string
          reference_order_id?: string | null
          staff_id?: string | null
          store_id?: number | null
          to_store_id?: number | null
          transfer_id?: string | null
        }
        Update: {
          change?: number
          created_at?: string | null
          from_store_id?: number | null
          id?: number
          notes?: string | null
          product_id?: string | null
          reason?: string
          reference_order_id?: string | null
          staff_id?: string | null
          store_id?: number | null
          to_store_id?: number | null
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_total"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_movements_reference_order_id_fkey"
            columns: ["reference_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          line_total: number | null
          order_id: string | null
          product_id: string | null
          product_name_snapshot: string
          product_sku_snapshot: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          line_total?: number | null
          order_id?: string | null
          product_id?: string | null
          product_name_snapshot: string
          product_sku_snapshot: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number | null
          order_id?: string | null
          product_id?: string | null
          product_name_snapshot?: string
          product_sku_snapshot?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_total"
            referencedColumns: ["product_id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          discount_amount: number | null
          id: string
          invoice_pdf_path: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          staff_id: string | null
          status: string
          store_id: number
          subtotal: number
          tax_amount: number
          tax_rate: number | null
          total: number
        }
        Insert: {
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          invoice_pdf_path?: string | null
          notes?: string | null
          order_number: string
          payment_method?: string | null
          staff_id?: string | null
          status?: string
          store_id: number
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          total?: number
        }
        Update: {
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          invoice_pdf_path?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          staff_id?: string | null
          status?: string
          store_id?: number
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          id: number
          name: string
          parent_id: number | null
          slug: string
        }
        Insert: {
          id?: number
          name: string
          parent_id?: number | null
          slug: string
        }
        Update: {
          id?: number
          name?: string
          parent_id?: number | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          product_id: string | null
          sort_order: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id?: string | null
          sort_order?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id?: string | null
          sort_order?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_total"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_vehicle_compatibility: {
        Row: {
          notes: string | null
          product_id: string
          vehicle_id: number
        }
        Insert: {
          notes?: string | null
          product_id: string
          vehicle_id: number
        }
        Update: {
          notes?: string | null
          product_id?: string
          vehicle_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_vehicle_compatibility_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vehicle_compatibility_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_total"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_vehicle_compatibility_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          condition: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          legacy_nr: string | null
          name: string
          notes: string | null
          oem_code: string | null
          price_cost: number | null
          price_sell: number | null
          search_vector: unknown
          sku: string
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          category_id?: number | null
          condition?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          legacy_nr?: string | null
          name: string
          notes?: string | null
          oem_code?: string | null
          price_cost?: number | null
          price_sell?: number | null
          search_vector?: unknown
          sku: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          category_id?: number | null
          condition?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          legacy_nr?: string | null
          name?: string
          notes?: string | null
          oem_code?: string | null
          price_cost?: number | null
          price_sell?: number | null
          search_vector?: unknown
          sku?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_store_access: {
        Row: {
          is_default: boolean | null
          staff_id: string
          store_id: number
        }
        Insert: {
          is_default?: boolean | null
          staff_id: string
          store_id: number
        }
        Update: {
          is_default?: boolean | null
          staff_id?: string
          store_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_store_access_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          last_counted_at: string | null
          location_code: string | null
          min_stock: number | null
          product_id: string
          quantity: number
          reserved_quantity: number
          store_id: number
          updated_at: string | null
        }
        Insert: {
          last_counted_at?: string | null
          location_code?: string | null
          min_stock?: number | null
          product_id: string
          quantity?: number
          reserved_quantity?: number
          store_id: number
          updated_at?: string | null
        }
        Update: {
          last_counted_at?: string | null
          location_code?: string | null
          min_stock?: number | null
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          store_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_total"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          quantity_received: number | null
          transfer_id: string | null
        }
        Insert: {
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          quantity_received?: number | null
          transfer_id?: string | null
        }
        Update: {
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quantity_received?: number | null
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_total"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string | null
          from_store_id: number
          id: string
          initiated_by: string | null
          notes: string | null
          received_at: string | null
          received_by: string | null
          shipped_at: string | null
          status: string
          to_store_id: number
          transfer_number: string
        }
        Insert: {
          created_at?: string | null
          from_store_id: number
          id?: string
          initiated_by?: string | null
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          shipped_at?: string | null
          status?: string
          to_store_id: number
          transfer_number: string
        }
        Update: {
          created_at?: string | null
          from_store_id?: number
          id?: string
          initiated_by?: string | null
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          shipped_at?: string | null
          status?: string
          to_store_id?: number
          transfer_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address_line1: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string | null
          email: string | null
          id: number
          is_active: boolean | null
          name: string
          phone: string | null
          postal_code: string | null
          type: string
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          phone?: string | null
          postal_code?: string | null
          type?: string
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          type?: string
        }
        Relationships: []
      }
      vehicle_makes: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          chassis_code: string | null
          engine: string | null
          id: number
          make_id: number | null
          model: string
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          chassis_code?: string | null
          engine?: string | null
          id?: number
          make_id?: number | null
          model: string
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          chassis_code?: string | null
          engine?: string | null
          id?: number
          make_id?: number | null
          model?: string
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_product_stock_total: {
        Row: {
          name: string | null
          product_id: string | null
          sku: string | null
          stores_with_stock: number | null
          total_available: number | null
          total_quantity: number | null
          total_reserved: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_available: {
        Args: { p_product_id: string; p_store_id: number }
        Returns: number
      }
      has_store_access: { Args: { p_store_id: number }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      next_customer_code: { Args: never; Returns: string }
      next_order_number: { Args: never; Returns: string }
      next_product_sku: { Args: never; Returns: string }
      release_order_item: { Args: { p_item_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
