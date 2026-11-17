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
      class_student_rates: {
        Row: {
          class_id: string
          student_rate: number
        }
        Insert: {
          class_id: string
          student_rate: number
        }
        Update: {
          class_id?: string
          student_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_student_rates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "class_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_student_rates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_tutor_rates: {
        Row: {
          class_id: string
          tutor_rate: number
        }
        Insert: {
          class_id: string
          tutor_rate: number
        }
        Update: {
          class_id?: string
          tutor_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_tutor_rates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "class_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_tutor_rates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          id: string
          name: string
          tutor_id: string
        }
        Insert: {
          capacity: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tutor_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          approved_at: string
          class_id: string
          class_name: string
          id: string
          lesson_id: string
          lesson_start: string
          logbook_id: string
          minutes: number
          tutor_id: string
          tutor_rate: number
        }
        Insert: {
          amount: number
          approved_at?: string
          class_id: string
          class_name: string
          id?: string
          lesson_id: string
          lesson_start: string
          logbook_id: string
          minutes: number
          tutor_id: string
          tutor_rate: number
        }
        Update: {
          amount?: number
          approved_at?: string
          class_id?: string
          class_name?: string
          id?: string
          lesson_id?: string
          lesson_start?: string
          logbook_id?: string
          minutes?: number
          tutor_id?: string
          tutor_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "earnings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_logbook_id_fkey"
            columns: ["logbook_id"]
            isOneToOne: false
            referencedRelation: "logbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          activated_at: string | null
          class_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Insert: {
          activated_at?: string | null
          class_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Update: {
          activated_at?: string | null
          class_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          enrollment_id: string
          hours: number
          id: string
          issued_at: string
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          student_rate: number
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount?: number
          enrollment_id: string
          hours: number
          id?: string
          issued_at?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          student_rate: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          enrollment_id?: string
          hours?: number
          id?: string
          issued_at?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          student_rate?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollment_balances"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "invoices_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "hour_ledger"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "invoices_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_rates: {
        Row: {
          lesson_id: string
          tutor_rate: number
        }
        Insert: {
          lesson_id: string
          tutor_rate: number
        }
        Update: {
          lesson_id?: string
          tutor_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_rates_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          class_id: string
          created_at: string
          end_at: string
          id: string
          start_at: string
          status: Database["public"]["Enums"]["lesson_status"]
          tutor_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          class_id: string
          created_at?: string
          end_at: string
          id?: string
          start_at: string
          status?: Database["public"]["Enums"]["lesson_status"]
          tutor_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          class_id?: string
          created_at?: string
          end_at?: string
          id?: string
          start_at?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logbook_entries: {
        Row: {
          activities: string
          created_at: string
          id: string
          lesson_id: string
          logbook_id: string
          observation: string
          recommendation: string
          topic: string
          updated_at: string
        }
        Insert: {
          activities: string
          created_at?: string
          id?: string
          lesson_id: string
          logbook_id: string
          observation: string
          recommendation: string
          topic: string
          updated_at?: string
        }
        Update: {
          activities?: string
          created_at?: string
          id?: string
          lesson_id?: string
          logbook_id?: string
          observation?: string
          recommendation?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logbook_entries_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_logbook_id_fkey"
            columns: ["logbook_id"]
            isOneToOne: false
            referencedRelation: "logbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      logbooks: {
        Row: {
          class_id: string
          created_at: string
          id: string
          month: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["logbook_status"]
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          month: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["logbook_status"]
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          month?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["logbook_status"]
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logbooks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbooks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbooks_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbooks_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
    }
    Views: {
      class_catalog: {
        Row: {
          capacity: number | null
          description: string | null
          id: string | null
          name: string | null
          seats_taken: number | null
          student_rate: number | null
          tutor_name: string | null
        }
        Relationships: []
      }
      enrollment_balances: {
        Row: {
          balance_minutes: number | null
          enrollment_id: string | null
        }
        Insert: {
          balance_minutes?: never
          enrollment_id?: string | null
        }
        Update: {
          balance_minutes?: never
          enrollment_id?: string | null
        }
        Relationships: []
      }
      hour_ledger: {
        Row: {
          class_id: string | null
          enrollment_id: string | null
          invoice_id: string | null
          kind: string | null
          lesson_id: string | null
          minutes: number | null
          occurred_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_logbook: { Args: { p_logbook_id: string }; Returns: undefined }
      cancel_lesson: {
        Args: { p_lesson_id: string; p_reason?: string }
        Returns: undefined
      }
      create_class: {
        Args: {
          p_capacity: number
          p_description: string
          p_name: string
          p_student_rate: number
          p_tutor_id: string
          p_tutor_rate: number
        }
        Returns: string
      }
      enroll: { Args: { p_class_id: string; p_hours: number }; Returns: string }
      mark_invoice_paid: {
        Args: { p_invoice_id: string; p_reference?: string }
        Returns: undefined
      }
      preview_logbook_earnings: {
        Args: { p_logbook_id: string }
        Returns: {
          amount: number
          lesson_id: string
          lesson_start: string
          minutes: number
          tutor_rate: number
        }[]
      }
      request_logbook_changes: {
        Args: { p_logbook_id: string; p_note: string }
        Returns: undefined
      }
      request_topup: {
        Args: { p_enrollment_id: string; p_hours: number }
        Returns: string
      }
      save_logbook_entry: {
        Args: {
          p_activities: string
          p_lesson_id: string
          p_observation: string
          p_recommendation: string
          p_topic: string
        }
        Returns: string
      }
      schedule_lesson: {
        Args: { p_class_id: string; p_end_at: string; p_start_at: string }
        Returns: string
      }
      submit_logbook: { Args: { p_logbook_id: string }; Returns: undefined }
      update_class: {
        Args: {
          p_capacity: number
          p_class_id: string
          p_description: string
          p_name: string
          p_student_rate: number
          p_tutor_id: string
          p_tutor_rate: number
        }
        Returns: undefined
      }
      void_invoice: {
        Args: { p_invoice_id: string; p_reason?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "tutor" | "student"
      enrollment_status: "pending_payment" | "active" | "cancelled"
      invoice_status: "unpaid" | "paid" | "void"
      lesson_status: "scheduled" | "cancelled"
      logbook_status: "draft" | "changes_requested" | "submitted" | "approved"
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
      app_role: ["admin", "tutor", "student"],
      enrollment_status: ["pending_payment", "active", "cancelled"],
      invoice_status: ["unpaid", "paid", "void"],
      lesson_status: ["scheduled", "cancelled"],
      logbook_status: ["draft", "changes_requested", "submitted", "approved"],
    },
  },
} as const

