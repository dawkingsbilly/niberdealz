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
      broadcasts: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string
          id: string
          recipient_count: number
          recipients: Json
          status: string
          subject: string
        }
        Insert: {
          audience: string
          body: string
          created_at?: string
          created_by: string
          id?: string
          recipient_count?: number
          recipients?: Json
          status?: string
          subject: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          recipient_count?: number
          recipients?: Json
          status?: string
          subject?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount_zar: number
          approved_at: string | null
          created_at: string
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          proof_url: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          vendor_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_zar: number
          approved_at?: string | null
          created_at?: string
          id?: string
          plan: Database["public"]["Enums"]["plan_tier"]
          proof_url: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          vendor_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_zar?: number
          approved_at?: string | null
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          proof_url?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          product_id: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          product_id: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          product_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_events_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
          vendor_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_review_notes: string | null
          ai_risk_score: number | null
          category: string
          checkout_url: string | null
          color: string | null
          created_at: string
          description: string
          id: string
          image_url: string | null
          images: string[]
          is_sold: boolean
          price_zar: number
          rejection_reason: string | null
          size: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock: number | null
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          ai_review_notes?: string | null
          ai_risk_score?: number | null
          category: string
          checkout_url?: string | null
          color?: string | null
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          images?: string[]
          is_sold?: boolean
          price_zar: number
          rejection_reason?: string | null
          size?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number | null
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          ai_review_notes?: string | null
          ai_risk_score?: number | null
          category?: string
          checkout_url?: string | null
          color?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          images?: string[]
          is_sold?: boolean
          price_zar?: number
          rejection_reason?: string | null
          size?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number | null
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      sale_campaigns: {
        Row: {
          created_at: string
          created_by: string
          description: string
          discount_pct: number
          ends_at: string
          id: string
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          discount_pct: number
          ends_at: string
          id?: string
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          discount_pct?: number
          ends_at?: string
          id?: string
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      sale_participants: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          status: string
          vendor_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          status?: string
          vendor_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sale_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_participants_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      site_themes: {
        Row: {
          activated_by: string | null
          created_at: string
          end_at: string
          id: string
          note: string | null
          start_at: string
          theme_key: string
        }
        Insert: {
          activated_by?: string | null
          created_at?: string
          end_at: string
          id?: string
          note?: string | null
          start_at?: string
          theme_key: string
        }
        Update: {
          activated_by?: string | null
          created_at?: string
          end_at?: string
          id?: string
          note?: string | null
          start_at?: string
          theme_key?: string
        }
        Relationships: []
      }
      store_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          rating: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          rating: number
          user_id: string
          vendor_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          message: string
          sent_by: string
          vendor_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          message: string
          sent_by: string
          vendor_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          message?: string
          sent_by?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_warnings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          ai_review_notes: string | null
          ai_risk_score: number | null
          business_description: string
          business_name: string
          category: string
          checkout_pref: string
          city: string
          created_at: string
          email: string
          id: string
          is_formal_business: boolean
          is_official: boolean
          logo_url: string | null
          owner_name: string
          plan: Database["public"]["Enums"]["plan_tier"]
          plan_active_until: string | null
          province: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["vendor_status"]
          updated_at: string
          verified: boolean
          website_url: string | null
          whatsapp_number: string
        }
        Insert: {
          ai_review_notes?: string | null
          ai_risk_score?: number | null
          business_description: string
          business_name: string
          category: string
          checkout_pref?: string
          city: string
          created_at?: string
          email: string
          id: string
          is_formal_business?: boolean
          is_official?: boolean
          logo_url?: string | null
          owner_name: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_active_until?: string | null
          province: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          verified?: boolean
          website_url?: string | null
          whatsapp_number: string
        }
        Update: {
          ai_review_notes?: string | null
          ai_risk_score?: number | null
          business_description?: string
          business_name?: string
          category?: string
          checkout_pref?: string
          city?: string
          created_at?: string
          email?: string
          id?: string
          is_formal_business?: boolean
          is_official?: boolean
          logo_url?: string | null
          owner_name?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_active_until?: string | null
          province?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          verified?: boolean
          website_url?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      plan_product_limit: {
        Args: { _plan: Database["public"]["Enums"]["plan_tier"] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "owner"
      payment_status: "pending" | "approved" | "rejected"
      plan_tier: "none" | "starter" | "growth" | "unlimited"
      product_status: "pending" | "approved" | "rejected"
      vendor_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["admin", "vendor", "owner"],
      payment_status: ["pending", "approved", "rejected"],
      plan_tier: ["none", "starter", "growth", "unlimited"],
      product_status: ["pending", "approved", "rejected"],
      vendor_status: ["pending", "approved", "rejected"],
    },
  },
} as const
