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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      consultations: {
        Row: {
          amount: number
          created_at: string
          department_id: string | null
          doctor_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          department_id?: string | null
          doctor_id: string
          id: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          department_id?: string | null
          doctor_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "medical_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method: string
          proof_image_url: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          proof_image_url: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          proof_image_url?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_reports: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          message: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          message: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          message?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_reports_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_requests: {
        Row: {
          admin_notes: string | null
          certificate_url: string
          created_at: string
          full_name: string
          id: string
          id_card_back_url: string
          id_card_front_url: string
          phone: string
          specialization: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          certificate_url: string
          created_at?: string
          full_name: string
          id?: string
          id_card_back_url: string
          id_card_front_url: string
          phone: string
          specialization: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          certificate_url?: string
          created_at?: string
          full_name?: string
          id?: string
          id_card_back_url?: string
          id_card_front_url?: string
          phone?: string
          specialization?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          address: string | null
          bio_ar: string | null
          bio_en: string | null
          consultation_fee: number | null
          created_at: string
          department_id: string
          doctor_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          phone_number: string | null
          price: number
          specialization_ar: string
          specialization_en: string
          updated_at: string
          user_id: string
          verification_requested_at: string | null
          whatsapp_number: string
        }
        Insert: {
          address?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          consultation_fee?: number | null
          created_at?: string
          department_id: string
          doctor_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          phone_number?: string | null
          price: number
          specialization_ar: string
          specialization_en: string
          updated_at?: string
          user_id: string
          verification_requested_at?: string | null
          whatsapp_number: string
        }
        Update: {
          address?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          consultation_fee?: number | null
          created_at?: string
          department_id?: string
          doctor_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          phone_number?: string | null
          price?: number
          specialization_ar?: string
          specialization_en?: string
          updated_at?: string
          user_id?: string
          verification_requested_at?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "medical_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_bookings: {
        Row: {
          created_at: string
          doctor_id: string | null
          doctor_name: string | null
          hospital_id: string
          id: string
          is_paid: boolean | null
          patient_area: string | null
          patient_name: string
          patient_phone: string
          payment_method: string | null
          price: number | null
          specialization: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          doctor_name?: string | null
          hospital_id: string
          id?: string
          is_paid?: boolean | null
          patient_area?: string | null
          patient_name: string
          patient_phone: string
          payment_method?: string | null
          price?: number | null
          specialization?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          doctor_name?: string | null
          hospital_id?: string
          id?: string
          is_paid?: boolean | null
          patient_area?: string | null
          patient_name?: string
          patient_phone?: string
          payment_method?: string | null
          price?: number | null
          specialization?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_bookings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "hospital_doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_bookings_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_doctors: {
        Row: {
          available_from: string | null
          available_to: string | null
          consultation_price: number | null
          created_at: string
          doctor_email: string
          doctor_name: string
          doctor_password: string
          hospital_id: string
          id: string
          image_url: string | null
          is_available: boolean | null
          phone: string | null
          specialization: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_to?: string | null
          consultation_price?: number | null
          created_at?: string
          doctor_email: string
          doctor_name: string
          doctor_password: string
          hospital_id: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          phone?: string | null
          specialization: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_to?: string | null
          consultation_price?: number | null
          created_at?: string
          doctor_email?: string
          doctor_name?: string
          doctor_password?: string
          hospital_id?: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          phone?: string | null
          specialization?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          hospital_name: string
          id: string
          logo_url: string | null
          ownership_docs_url: string
          phone: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          hospital_name: string
          id?: string
          logo_url?: string | null
          ownership_docs_url: string
          phone: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          hospital_name?: string
          id?: string
          logo_url?: string | null
          ownership_docs_url?: string
          phone?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hospital_reviews: {
        Row: {
          comment: string | null
          created_at: string
          hospital_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_reviews_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string
          status: Database["public"]["Enums"]["hospital_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone: string
          status?: Database["public"]["Enums"]["hospital_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string
          status?: Database["public"]["Enums"]["hospital_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_departments: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name_ar: string
          name_en: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name_ar: string
          name_en: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          referral_source: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone: string
          referral_source?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          referral_source?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          doctor_id: string | null
          id: string
          receiver_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          id: string
          receiver_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          id?: string
          receiver_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdraw_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          commission: number
          created_at: string
          doctor_id: string
          id: string
          net_amount: number
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          commission?: number
          created_at?: string
          doctor_id: string
          id?: string
          net_amount: number
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          commission?: number
          created_at?: string
          doctor_id?: string
          id?: string
          net_amount?: number
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdraw_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_hospital_request: {
        Args: { _approve: boolean; _notes?: string; _request_id: string }
        Returns: undefined
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      perform_consultation: {
        Args: { _doctor_id: string }
        Returns: {
          tx_id: string
        }[]
      }
      perform_transfer: {
        Args: { _amount: number; _receiver_id: string }
        Returns: {
          tx_id: string
        }[]
      }
    }
    Enums: {
      hospital_status:
        | "empty"
        | "low_traffic"
        | "medium_traffic"
        | "high_traffic"
        | "very_crowded"
      request_status: "pending" | "approved" | "rejected"
      transaction_type: "deposit" | "withdraw" | "consultation" | "transfer"
      user_type: "user" | "doctor" | "hospital"
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
      hospital_status: [
        "empty",
        "low_traffic",
        "medium_traffic",
        "high_traffic",
        "very_crowded",
      ],
      request_status: ["pending", "approved", "rejected"],
      transaction_type: ["deposit", "withdraw", "consultation", "transfer"],
      user_type: ["user", "doctor", "hospital"],
    },
  },
} as const
