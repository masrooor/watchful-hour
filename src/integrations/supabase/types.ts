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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance_settings: {
        Row: {
          admin_notification_email: string | null
          allowed_latitude: number | null
          allowed_longitude: number | null
          allowed_radius_meters: number | null
          created_at: string
          grace_period_minutes: number
          id: string
          location_name: string | null
          location_restriction_enabled: boolean
          notify_admin_on_absence: boolean
          notify_admin_on_late: boolean
          notify_employee_on_clockout: boolean
          notify_employee_on_late: boolean
          office_end_time: string
          office_start_time: string
          probation_period_days: number
          required_daily_hours: number
          updated_at: string
          work_days: number[]
        }
        Insert: {
          admin_notification_email?: string | null
          allowed_latitude?: number | null
          allowed_longitude?: number | null
          allowed_radius_meters?: number | null
          created_at?: string
          grace_period_minutes?: number
          id?: string
          location_name?: string | null
          location_restriction_enabled?: boolean
          notify_admin_on_absence?: boolean
          notify_admin_on_late?: boolean
          notify_employee_on_clockout?: boolean
          notify_employee_on_late?: boolean
          office_end_time?: string
          office_start_time?: string
          probation_period_days?: number
          required_daily_hours?: number
          updated_at?: string
          work_days?: number[]
        }
        Update: {
          admin_notification_email?: string | null
          allowed_latitude?: number | null
          allowed_longitude?: number | null
          allowed_radius_meters?: number | null
          created_at?: string
          grace_period_minutes?: number
          id?: string
          location_name?: string | null
          location_restriction_enabled?: boolean
          notify_admin_on_absence?: boolean
          notify_admin_on_late?: boolean
          notify_employee_on_clockout?: boolean
          notify_employee_on_late?: boolean
          office_end_time?: string
          office_start_time?: string
          probation_period_days?: number
          required_daily_hours?: number
          updated_at?: string
          work_days?: number[]
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      employee_allowances: {
        Row: {
          allowance_type: string
          amount: number
          created_at: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowance_type: string
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowance_type?: string
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_deductions: {
        Row: {
          amount: number
          created_at: string
          deduction_type: string
          id: string
          is_active: boolean
          is_percentage: boolean
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deduction_type: string
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_type?: string
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_loans: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          monthly_deduction: number
          reason: string | null
          start_date: string
          total_amount: number
          total_deducted: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          monthly_deduction?: number
          reason?: string | null
          start_date?: string
          total_amount?: number
          total_deducted?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          monthly_deduction?: number
          reason?: string | null
          start_date?: string
          total_amount?: number
          total_deducted?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          created_by: string
          date: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          annual_total: number
          annual_used: number
          casual_total: number
          casual_used: number
          created_at: string
          id: string
          sick_total: number
          sick_used: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          annual_total?: number
          annual_used?: number
          casual_total?: number
          casual_used?: number
          created_at?: string
          id?: string
          sick_total?: number
          sick_used?: number
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          annual_total?: number
          annual_used?: number
          casual_total?: number
          casual_used?: number
          created_at?: string
          id?: string
          sick_total?: number
          sick_used?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          cnic: string | null
          created_at: string
          date_of_birth: string | null
          department: string
          designation: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          employment_type: string | null
          id: string
          job_status: string
          joining_date: string | null
          name: string
          phone: string | null
          required_daily_hours: number | null
          salary: number | null
          shift_end: string | null
          shift_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          cnic?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string
          designation?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_type?: string | null
          id?: string
          job_status?: string
          joining_date?: string | null
          name?: string
          phone?: string | null
          required_daily_hours?: number | null
          salary?: number | null
          shift_end?: string | null
          shift_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          cnic?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string
          designation?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_type?: string | null
          id?: string
          job_status?: string
          joining_date?: string | null
          name?: string
          phone?: string | null
          required_daily_hours?: number | null
          salary?: number | null
          shift_end?: string | null
          shift_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salary_increments: {
        Row: {
          approved_by: string | null
          created_at: string
          effective_date: string
          id: string
          increment_amount: number
          increment_percentage: number | null
          new_salary: number
          previous_salary: number
          reason: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          increment_amount?: number
          increment_percentage?: number | null
          new_salary?: number
          previous_salary?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          increment_amount?: number
          increment_percentage?: number | null
          new_salary?: number
          previous_salary?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tax_slabs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_salary: number | null
          min_salary: number
          percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_salary?: number | null
          min_salary?: number
          percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_salary?: number | null
          min_salary?: number
          percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_leave_balance: { Args: { _user_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "hr" | "manager" | "payroll_officer"
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
      app_role: ["admin", "user", "hr", "manager", "payroll_officer"],
    },
  },
} as const
