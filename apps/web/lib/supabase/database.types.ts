
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_checks": {
                  Row: {
                    "accepted_meters": number,"pact_id": string,"reasons": (string)[],"result": NonNullable<Json>,"strava_activity_id": number,"synced_at": string,"user_id": string,"verdict": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_meters"?: number,"pact_id": string,"reasons"?: (string)[],"result": NonNullable<Json>,"strava_activity_id": number,"synced_at"?: string,"user_id": string,"verdict": string
                  }
                  Update: {
                    "accepted_meters"?: number,"pact_id"?: string,"reasons"?: (string)[],"result"?: NonNullable<Json>,"strava_activity_id"?: number,"synced_at"?: string,"user_id"?: string,"verdict"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_checks_pact_id_user_id_fkey"
      columns: ["pact_id","user_id"]
isOneToOne: false
      referencedRelation: "memberships"
      referencedColumns: ["pact_id","user_id"]
    }
                  ]
                },"deposits": {
                  Row: {
                    "confirmed_at": string,"lamports": number,"pact_id": string,"signature": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at": string,"lamports": number,"pact_id": string,"signature": string,"user_id": string
                  }
                  Update: {
                    "confirmed_at"?: string,"lamports"?: number,"pact_id"?: string,"signature"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deposits_pact_id_user_id_fkey"
      columns: ["pact_id","user_id"]
isOneToOne: true
      referencedRelation: "memberships"
      referencedColumns: ["pact_id","user_id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "joined_at": string,"left_at": string | null,"mode": string,"pact_id": string,"show_in_standings": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"left_at"?: string | null,"mode"?: string,"pact_id": string,"show_in_standings"?: boolean,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string,"left_at"?: string | null,"mode"?: string,"pact_id"?: string,"show_in_standings"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_pact_id_fkey"
      columns: ["pact_id"]
isOneToOne: false
      referencedRelation: "pacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pacts": {
                  Row: {
                    "cancelled_at": string | null,"created_at": string,"ends_at": string,"funding_cutoff": string,"goal_meters": number,"host_id": string | null,"id": string,"invite_code": string | null,"is_demo": boolean,"stake_lamports": number,"starts_at": string,"sync_cutoff": string,"title": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelled_at"?: string | null,"created_at"?: string,"ends_at": string,"funding_cutoff": string,"goal_meters": number,"host_id"?: string | null,"id"?: string,"invite_code"?: string | null,"is_demo"?: boolean,"stake_lamports": number,"starts_at": string,"sync_cutoff": string,"title": string,"visibility"?: string
                  }
                  Update: {
                    "cancelled_at"?: string | null,"created_at"?: string,"ends_at"?: string,"funding_cutoff"?: string,"goal_meters"?: number,"host_id"?: string | null,"id"?: string,"invite_code"?: string | null,"is_demo"?: boolean,"stake_lamports"?: number,"starts_at"?: string,"sync_cutoff"?: string,"title"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pacts_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payouts": {
                  Row: {
                    "claimed_at": string | null,"id": number,"kind": string,"lamports": number,"last_valid_block_height": number | null,"pact_id": string,"participant_id": string,"signature": string | null,"status": string,"wallet": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claimed_at"?: string | null,"id"?: never,"kind": string,"lamports": number,"last_valid_block_height"?: number | null,"pact_id": string,"participant_id": string,"signature"?: string | null,"status"?: string,"wallet": string
                  }
                  Update: {
                    "claimed_at"?: string | null,"id"?: never,"kind"?: string,"lamports"?: number,"last_valid_block_height"?: number | null,"pact_id"?: string,"participant_id"?: string,"signature"?: string | null,"status"?: string,"wallet"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payouts_pact_id_fkey"
      columns: ["pact_id"]
isOneToOne: false
      referencedRelation: "settlements"
      referencedColumns: ["pact_id"]
    },{
      foreignKeyName: "payouts_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"email": string,"id": string,"strava_athlete_id": number | null,"wallet_address": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"email": string,"id": string,"strava_athlete_id"?: number | null,"wallet_address"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"email"?: string,"id"?: string,"strava_athlete_id"?: number | null,"wallet_address"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"settlements": {
                  Row: {
                    "created_at": string,"pact_id": string,"plan": NonNullable<Json>,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"pact_id": string,"plan": NonNullable<Json>,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"pact_id"?: string,"plan"?: NonNullable<Json>,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "settlements_pact_id_fkey"
      columns: ["pact_id"]
isOneToOne: true
      referencedRelation: "pacts"
      referencedColumns: ["id"]
    }
                  ]
                },"strava_tokens": {
                  Row: {
                    "access_token": string,"expires_at": string,"refresh_token": string,"scope": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token": string,"expires_at": string,"refresh_token": string,"scope": string,"user_id": string
                  }
                  Update: {
                    "access_token"?: string,"expires_at"?: string,"refresh_token"?: string,"scope"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "strava_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sync_errors": {
                  Row: {
                    "created_at": string,"id": number,"kind": string,"message": string,"pact_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"kind": string,"message": string,"pact_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"kind"?: string,"message"?: string,"pact_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sync_errors_pact_id_fkey"
      columns: ["pact_id"]
isOneToOne: false
      referencedRelation: "pacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sync_errors_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_settlement":
{ Args: { "p_pact_id": string,"p_payouts": Json,"p_plan": Json }; Returns: boolean
                           },
"is_member":
{ Args: { "p_pact_id": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
