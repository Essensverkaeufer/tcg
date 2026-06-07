export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_path: string | null;
          avatar_url: string | null;
          bio: string | null;
          coins: number;
          wins: number;
          losses: number;
          matches_played: number;
          packs_opened: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_path?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          coins?: number;
          wins?: number;
          losses?: number;
          matches_played?: number;
          packs_opened?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      card_templates: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC" | "ULTRA_LEGENDARY" | "DIVINE";
          card_type: "CHARACTER" | "BUILDING" | "ITEM" | "LEADER";
          attack: number;
          health: number;
          size: number;
          aura: number;
          image_url: string;
          sound_effect_url: string | null;
          flavor_text: string | null;
          ability_data: Json;
          balance_version: string;
          created_at: string;
          category: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["card_templates"]["Row"]> & {
          slug: string;
          name: string;
          description: string;
          rarity: Database["public"]["Tables"]["card_templates"]["Row"]["rarity"];
          card_type: Database["public"]["Tables"]["card_templates"]["Row"]["card_type"];
        };
        Update: Partial<Database["public"]["Tables"]["card_templates"]["Insert"]>;
        Relationships: [];
      };
      card_template_submissions: {
        Row: {
          id: string;
          submitter_id: string;
          reviewer_id: string | null;
          status: "PENDING" | "APPROVED";
          slug: string;
          name: string;
          description: string;
          rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC" | "ULTRA_LEGENDARY" | "DIVINE";
          card_type: "CHARACTER" | "BUILDING" | "ITEM" | "LEADER";
          attack: number;
          health: number;
          size: number;
          aura: number;
          image_url: string;
          image_path: string | null;
          sound_effect_url: string;
          sound_effect_path: string | null;
          flavor_text: string | null;
          ability_data: Json;
          submitted_at: string;
          reviewed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submitter_id: string;
          reviewer_id?: string | null;
          status?: Database["public"]["Tables"]["card_template_submissions"]["Row"]["status"];
          slug: string;
          name: string;
          description?: string;
          rarity: Database["public"]["Tables"]["card_template_submissions"]["Row"]["rarity"];
          card_type: Database["public"]["Tables"]["card_template_submissions"]["Row"]["card_type"];
          attack?: number;
          health?: number;
          size?: number;
          aura?: number;
          image_url?: string;
          image_path?: string | null;
          sound_effect_url?: string;
          sound_effect_path?: string | null;
          flavor_text?: string | null;
          ability_data?: Json;
          submitted_at?: string;
          reviewed_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["card_template_submissions"]["Insert"]>;
        Relationships: [];
      };
      user_card_collection: {
        Row: {
          id: string;
          user_id: string;
          card_template_id: string;
          quantity: number;
          first_owned_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_template_id: string;
          quantity?: number;
          first_owned_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_card_collection"]["Insert"]>;
        Relationships: [];
      };
      pack_openings: {
        Row: {
          id: string;
          user_id: string;
          pack_slug: string;
          cards: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pack_slug: string;
          cards?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pack_openings"]["Insert"]>;
        Relationships: [];
      };
      decks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["decks"]["Insert"]>;
        Relationships: [];
      };
      deck_cards: {
        Row: {
          id: string;
          deck_id: string;
          card_template_id: string;
          quantity: number;
        };
        Insert: {
          id?: string;
          deck_id: string;
          card_template_id: string;
          quantity: number;
        };
        Update: Partial<Database["public"]["Tables"]["deck_cards"]["Insert"]>;
        Relationships: [];
      };
      currency_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: "DAILY_LOGIN" | "MATCH_WIN" | "MATCH_LOSS" | "MATCH_DRAW" | "PACK_PURCHASE" | "GACHA_PULL" | "ADMIN_GRANT";
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: Database["public"]["Tables"]["currency_transactions"]["Row"]["reason"];
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["currency_transactions"]["Insert"]>;
        Relationships: [];
      };
      daily_login_rewards: {
        Row: {
          id: string;
          user_id: string;
          reward_date: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_date?: string;
          amount?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_login_rewards"]["Insert"]>;
        Relationships: [];
      };
      gacha_pity: {
        Row: {
          user_id: string;
          banner_slug: string;
          pulls_since_featured: number;
          total_pulls: number;
          featured_copies: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          banner_slug: string;
          pulls_since_featured?: number;
          total_pulls?: number;
          featured_copies?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gacha_pity"]["Insert"]>;
        Relationships: [];
      };
      gacha_pull_history: {
        Row: {
          id: string;
          user_id: string;
          banner_slug: string;
          pull_count: number;
          cost: number;
          rewards: Json;
          pity_before: number;
          pity_after: number;
          featured_hits: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          banner_slug: string;
          pull_count: number;
          cost: number;
          rewards?: Json;
          pity_before: number;
          pity_after: number;
          featured_hits?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gacha_pull_history"]["Insert"]>;
        Relationships: [];
      };
      story_progress: {
        Row: {
          user_id: string;
          encounter_slug: string;
          status: "ATTEMPTED" | "COMPLETED";
          wins: number;
          losses: number;
          best_turns: number | null;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          encounter_slug: string;
          status?: Database["public"]["Tables"]["story_progress"]["Row"]["status"];
          wins?: number;
          losses?: number;
          best_turns?: number | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["story_progress"]["Insert"]>;
        Relationships: [];
      };
      matchmaking_tickets: {
        Row: {
          id: string;
          user_id: string;
          deck_id: string;
          status: "QUEUED" | "MATCHED" | "CANCELLED" | "EXPIRED";
          region: string;
          server_id: string | null;
          matched_match_id: string | null;
          created_at: string;
          heartbeat_at: string;
          matched_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          deck_id: string;
          status?: Database["public"]["Tables"]["matchmaking_tickets"]["Row"]["status"];
          region?: string;
          server_id?: string | null;
          matched_match_id?: string | null;
          created_at?: string;
          heartbeat_at?: string;
          matched_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["matchmaking_tickets"]["Insert"]>;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          status: "QUEUED" | "ACTIVE" | "FINISHED" | "CANCELLED";
          winner_id: string | null;
          final_state: Json | null;
          server_id: string | null;
          current_turn: number;
          active_player_id: string | null;
          state_snapshot: Json | null;
          finish_reason: string | null;
          reward_granted_at: string | null;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          status?: Database["public"]["Tables"]["matches"]["Row"]["status"];
          winner_id?: string | null;
          final_state?: Json | null;
          server_id?: string | null;
          current_turn?: number;
          active_player_id?: string | null;
          state_snapshot?: Json | null;
          finish_reason?: string | null;
          reward_granted_at?: string | null;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [];
      };
      match_players: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          deck_id: string | null;
          seat: number;
          result: "WIN" | "LOSS" | "DRAW" | null;
          coins_earned: number;
          connection_state: "ONLINE" | "OFFLINE" | "DISCONNECTED";
          deck_snapshot: Json | null;
          disconnected_at: string | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          deck_id?: string | null;
          seat: number;
          result?: Database["public"]["Tables"]["match_players"]["Row"]["result"];
          coins_earned?: number;
          connection_state?: Database["public"]["Tables"]["match_players"]["Row"]["connection_state"];
          deck_snapshot?: Json | null;
          disconnected_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["match_players"]["Insert"]>;
        Relationships: [];
      };
      match_action_logs: {
        Row: {
          id: string;
          match_id: string;
          user_id: string | null;
          action: string;
          payload: Json;
          state_hash: string | null;
          action_seq: number | null;
          client_action_id: string | null;
          resolved_state_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id?: string | null;
          action: string;
          payload?: Json;
          state_hash?: string | null;
          action_seq?: number | null;
          client_action_id?: string | null;
          resolved_state_hash?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["match_action_logs"]["Insert"]>;
        Relationships: [];
      };
      match_events: {
        Row: {
          id: string;
          match_id: string;
          event_type: string;
          message: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          event_type: string;
          message: string;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["match_events"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      grant_pack_opening: {
        Args: {
          p_user_id: string;
          p_pack_slug: string;
          p_price: number;
          p_card_template_ids: string[];
        };
        Returns: Array<{
          coins: number;
          packs_opened: number;
        }>;
      };
      finish_multiplayer_match: {
        Args: {
          p_match_id: string;
          p_winner_id: string | null;
          p_finish_reason: string;
          p_winner_reward?: number;
          p_loser_reward?: number;
          p_draw_reward?: number;
        };
        Returns: Array<{
          match_id: string;
          rewards_granted: boolean;
        }>;
      };
      claim_daily_login_reward: {
        Args: {
          p_user_id: string;
          p_reward?: number;
        };
        Returns: Array<{
          coins: number;
          claimed: boolean;
          reward_date: string;
        }>;
      };
      grant_gacha_pulls: {
        Args: {
          p_user_id: string;
          p_banner_slug: string;
          p_pull_count: number;
          p_featured_slug: string;
          p_price_per_pull?: number;
          p_hard_pity?: number;
        };
        Returns: Array<{
          coins: number;
          pulls_since_featured: number;
          total_pulls: number;
          featured_copies: number;
          rewards: Json;
          featured_hits: number;
          cost: number;
          pity_before: number;
          pity_after: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
