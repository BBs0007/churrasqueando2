export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      club_discount_campaigns: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          description: string;
          discount_type: "fixed" | "percentage";
          ends_at: string | null;
          id: string;
          scope: "all" | "categories" | "products";
          starts_at: string | null;
          title: string;
          updated_at: string;
          value: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          discount_type: "fixed" | "percentage";
          ends_at?: string | null;
          id?: string;
          scope: "all" | "categories" | "products";
          starts_at?: string | null;
          title: string;
          updated_at?: string;
          value: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          discount_type?: "fixed" | "percentage";
          ends_at?: string | null;
          id?: string;
          scope?: "all" | "categories" | "products";
          starts_at?: string | null;
          title?: string;
          updated_at?: string;
          value?: number;
        };
        Relationships: [];
      };
      club_discount_campaign_categories: {
        Row: { campaign_id: string; category_id: string };
        Insert: { campaign_id: string; category_id: string };
        Update: { campaign_id?: string; category_id?: string };
        Relationships: [];
      };
      club_discount_campaign_products: {
        Row: { campaign_id: string; product_id: string };
        Insert: { campaign_id: string; product_id: string };
        Update: { campaign_id?: string; product_id?: string };
        Relationships: [];
      };
      club_discount_codes: {
        Row: {
          campaign_id: string;
          code: string;
          created_at: string;
          id: string;
          redeemed_at: string | null;
          redeemed_discount_amount: number | null;
          redeemed_order_id: string | null;
          user_id: string;
        };
        Insert: {
          campaign_id: string;
          code: string;
          created_at?: string;
          id?: string;
          redeemed_at?: string | null;
          redeemed_discount_amount?: number | null;
          redeemed_order_id?: string | null;
          user_id: string;
        };
        Update: {
          campaign_id?: string;
          code?: string;
          created_at?: string;
          id?: string;
          redeemed_at?: string | null;
          redeemed_discount_amount?: number | null;
          redeemed_order_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      combos: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          items: string[];
          name: string;
          price: number;
          sort_order: number;
          unit: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string;
          id: string;
          image_url?: string | null;
          items?: string[];
          name: string;
          price?: number;
          sort_order?: number;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          items?: string[];
          name?: string;
          price?: number;
          sort_order?: number;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      discount_code_categories: {
        Row: { category_id: string; code_id: string };
        Insert: { category_id: string; code_id: string };
        Update: { category_id?: string; code_id?: string };
        Relationships: [];
      };
      discount_code_products: {
        Row: { code_id: string; product_id: string };
        Insert: { code_id: string; product_id: string };
        Update: { code_id?: string; product_id?: string };
        Relationships: [];
      };
      discount_codes: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          created_by: string | null;
          description: string;
          discount_type: "fixed" | "percentage";
          ends_at: string | null;
          id: string;
          scope: "all" | "categories" | "products";
          starts_at: string | null;
          updated_at: string;
          value: number;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          discount_type?: "fixed" | "percentage";
          ends_at?: string | null;
          id?: string;
          scope?: "all" | "categories" | "products";
          starts_at?: string | null;
          updated_at?: string;
          value?: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          discount_type?: "fixed" | "percentage";
          ends_at?: string | null;
          id?: string;
          scope?: "all" | "categories" | "products";
          starts_at?: string | null;
          updated_at?: string;
          value?: number;
        };
        Relationships: [];
      };
      club_membership_plans: {
        Row: {
          active: boolean;
          created_at: string;
          currency: string;
          duration_days: number;
          id: string;
          interval: string;
          name: string;
          price: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          currency?: string;
          duration_days: number;
          id?: string;
          interval: string;
          name: string;
          price: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          currency?: string;
          duration_days?: number;
          id?: string;
          interval?: string;
          name?: string;
          price?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      club_courses: {
        Row: {
          active: boolean;
          bullets: Json;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          sort_order: number;
          subtitle: string;
          tag: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          bullets?: Json;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          sort_order?: number;
          subtitle?: string;
          tag?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          bullets?: Json;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          sort_order?: number;
          subtitle?: string;
          tag?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      catering_packages: {
        Row: {
          active: boolean;
          created_at: string;
          cortes: Json;
          guarniciones: Json;
          highlight: string;
          id: string;
          image_url: string | null;
          includes_note: string;
          name: string;
          picada: string;
          portion: string;
          price: number;
          sort_order: number;
          updated_at: string;
          utencilios: Json;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          cortes?: Json;
          guarniciones?: Json;
          highlight?: string;
          id?: string;
          image_url?: string | null;
          includes_note?: string;
          name: string;
          picada?: string;
          portion?: string;
          price?: number;
          sort_order?: number;
          updated_at?: string;
          utencilios?: Json;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          cortes?: Json;
          guarniciones?: Json;
          highlight?: string;
          id?: string;
          image_url?: string | null;
          includes_note?: string;
          name?: string;
          picada?: string;
          portion?: string;
          price?: number;
          sort_order?: number;
          updated_at?: string;
          utencilios?: Json;
        };
        Relationships: [];
      };
      club_subcourses: {
        Row: {
          active: boolean;
          course_id: string;
          created_at: string;
          description: string;
          exam_questions: Json;
          id: string;
          practical_task: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          course_id: string;
          created_at?: string;
          description?: string;
          exam_questions?: Json;
          id?: string;
          practical_task?: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          course_id?: string;
          created_at?: string;
          description?: string;
          exam_questions?: Json;
          id?: string;
          practical_task?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_lessons: {
        Row: {
          course_id: string;
          created_at: string;
          description: string;
          id: string;
          pdf_url: string | null;
          sort_order: number;
          subcourse_id: string;
          title: string;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string;
          id?: string;
          pdf_url?: string | null;
          sort_order?: number;
          subcourse_id: string;
          title: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          pdf_url?: string | null;
          sort_order?: number;
          subcourse_id?: string;
          title?: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [];
      };
      course_lesson_comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          lesson_id: string;
          parent_comment_id: string | null;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          lesson_id: string;
          parent_comment_id?: string | null;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          lesson_id?: string;
          parent_comment_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      course_lesson_comment_likes: {
        Row: { comment_id: string; created_at: string; user_id: string };
        Insert: { comment_id: string; created_at?: string; user_id: string };
        Update: { comment_id?: string; created_at?: string; user_id?: string };
        Relationships: [];
      };
      course_subcourse_exam_keys: {
        Row: { answer_key: Json; subcourse_id: string; updated_at: string };
        Insert: { answer_key?: Json; subcourse_id: string; updated_at?: string };
        Update: { answer_key?: Json; subcourse_id?: string; updated_at?: string };
        Relationships: [];
      };
      course_assessment_attempts: {
        Row: {
          answers: Json;
          created_at: string;
          id: string;
          question_count: number;
          score: number;
          subcourse_id: string;
          user_id: string;
        };
        Insert: {
          answers: Json;
          created_at?: string;
          id?: string;
          question_count: number;
          score: number;
          subcourse_id: string;
          user_id: string;
        };
        Update: {
          answers?: Json;
          created_at?: string;
          id?: string;
          question_count?: number;
          score?: number;
          subcourse_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      course_practical_upload_tickets: {
        Row: {
          consumed_at: string | null;
          content_type: string;
          created_at: string;
          max_size: number;
          path: string;
          subcourse_id: string;
          user_id: string;
        };
        Insert: {
          consumed_at?: string | null;
          content_type: string;
          created_at?: string;
          max_size: number;
          path: string;
          subcourse_id: string;
          user_id: string;
        };
        Update: {
          consumed_at?: string | null;
          content_type?: string;
          created_at?: string;
          max_size?: number;
          path?: string;
          subcourse_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      course_practical_submissions: {
        Row: {
          admin_feedback: string;
          created_at: string;
          evidence_path: string;
          id: string;
          note: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          subcourse_id: string;
          user_id: string;
        };
        Insert: {
          admin_feedback?: string;
          created_at?: string;
          evidence_path: string;
          id?: string;
          note?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          subcourse_id: string;
          user_id: string;
        };
        Update: {
          admin_feedback?: string;
          created_at?: string;
          evidence_path?: string;
          id?: string;
          note?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          subcourse_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      course_lesson_progress: {
        Row: {
          completed_at: string;
          lesson_id: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          lesson_id: string;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          lesson_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      course_completion_rewards: {
        Row: {
          completed_at: string;
          course_id: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          course_id: string;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          course_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      membership_requests: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          country_code: string;
          currency: string;
          membership_plan_id: string | null;
          plan: string;
          payment_method: string;
          reference: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["request_status"];
          user_id: string;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          id?: string;
          country_code?: string;
          currency?: string;
          membership_plan_id?: string | null;
          plan?: string;
          payment_method?: string;
          reference?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          country_code?: string;
          currency?: string;
          membership_plan_id?: string | null;
          plan?: string;
          payment_method?: string;
          reference?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          user_id?: string;
        };
        Relationships: [];
      };
      membership_payment_settings: {
        Row: {
          bolivia_qr_url: string | null;
          id: boolean;
          international_instructions: string;
        };
        Insert: {
          bolivia_qr_url?: string | null;
          id?: boolean;
          international_instructions?: string;
        };
        Update: {
          bolivia_qr_url?: string | null;
          id?: boolean;
          international_instructions?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          address: string | null;
          created_at: string;
          customer_name: string;
          customer_phone: string;
          delivery_type: string;
          department: string | null;
          id: string;
          items: Json;
          lat: number | null;
          lng: number | null;
          notes: string | null;
          points_earned: number;
          province: string | null;
          status: string;
          source: string;
          total: number;
          town: string | null;
          user_id: string | null;
          brasa_discount_amount: number;
          brasa_points_redeemed: number;
          discount_code: string | null;
          discount_amount: number;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          customer_name?: string;
          customer_phone?: string;
          delivery_type?: string;
          department?: string | null;
          id?: string;
          items?: Json;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          points_earned?: number;
          province?: string | null;
          status?: string;
          source?: string;
          total?: number;
          town?: string | null;
          user_id?: string | null;
          brasa_discount_amount?: number;
          brasa_points_redeemed?: number;
          discount_code?: string | null;
          discount_amount?: number;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          customer_name?: string;
          customer_phone?: string;
          delivery_type?: string;
          department?: string | null;
          id?: string;
          items?: Json;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          points_earned?: number;
          province?: string | null;
          status?: string;
          source?: string;
          total?: number;
          town?: string | null;
          user_id?: string | null;
          brasa_discount_amount?: number;
          brasa_points_redeemed?: number;
          discount_code?: string | null;
          discount_amount?: number;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          section_id: string | null;
          sort_order: number;
          tagline: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          name: string;
          section_id?: string | null;
          sort_order?: number;
          tagline?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          section_id?: string | null;
          sort_order?: number;
          tagline?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          active: boolean;
          category_id: string | null;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          is_best_seller: boolean;
          name: string;
          price: number;
          sort_order: number;
          unit: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category_id?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          is_best_seller?: boolean;
          name: string;
          price?: number;
          sort_order?: number;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category_id?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          is_best_seller?: boolean;
          name?: string;
          price?: number;
          sort_order?: number;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      point_transactions: {
        Row: {
          created_at: string;
          id: string;
          order_id: string | null;
          points: number;
          reason: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id?: string | null;
          points: number;
          reason: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string | null;
          points?: number;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "point_transactions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          address: string;
          avatar_url: string | null;
          birth_date: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          membership_expires_at: string | null;
          membership_plan_id: string | null;
          membership_status: Database["public"]["Enums"]["membership_status"];
          phone: string;
          points: number;
          updated_at: string;
        };
        Insert: {
          address?: string;
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id: string;
          membership_expires_at?: string | null;
          membership_plan_id?: string | null;
          membership_status?: Database["public"]["Enums"]["membership_status"];
          phone?: string;
          points?: number;
          updated_at?: string;
        };
        Update: {
          address?: string;
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          membership_expires_at?: string | null;
          membership_plan_id?: string | null;
          membership_status?: Database["public"]["Enums"]["membership_status"];
          phone?: string;
          points?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      finalize_club_discount_checkout: {
        Args: {
          p_member_code: string | null;
          p_order_id: string;
          p_points: number;
          p_user_id: string;
        };
        Returns: number;
      };
      admin_upsert_club_discount_campaign: {
        Args: {
          p_active: boolean;
          p_admin_user_id: string;
          p_campaign_id: string | null;
          p_category_ids: string[];
          p_description: string;
          p_discount_type: string;
          p_ends_at: string | null;
          p_product_ids: string[];
          p_scope: string;
          p_starts_at: string | null;
          p_title: string;
          p_value: number;
        };
        Returns: string;
      };
      complete_course_lesson: {
        Args: { p_lesson_id: string };
        Returns: {
          course_bonus: number;
          course_completed: boolean;
          lesson_points: number;
        }[];
      };
      start_course_lesson_watch: {
        Args: { p_lesson_id: string };
        Returns: string;
      };
      record_course_lesson_watch: {
        Args: {
          p_duration_seconds: number;
          p_ended?: boolean;
          p_is_playing: boolean;
          p_position_seconds: number;
          p_session_id: string;
        };
        Returns: boolean;
      };
      complete_course_lesson_after_watch: {
        Args: { p_lesson_id: string; p_session_id: string };
        Returns: {
          course_bonus: number;
          course_completed: boolean;
          lesson_points: number;
        }[];
      };
      redeem_brasa_points: {
        Args: { p_order_id: string; p_points: number };
        Returns: number;
      };
      review_membership_request: {
        Args: { p_approve: boolean; p_request_id: string };
        Returns: undefined;
      };
      admin_activate_customer_membership: {
        Args: {
          p_country_code: string;
          p_customer_id: string;
          p_payment_confirmed: boolean;
          p_payment_method: string;
          p_plan_id: string;
          p_reference?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      membership_status: "inactive" | "active" | "expired";
      request_status: "pending" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      membership_status: ["inactive", "active", "expired"],
      request_status: ["pending", "approved", "rejected"],
    },
  },
} as const;
