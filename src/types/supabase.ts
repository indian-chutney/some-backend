export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string;
          username: string;
          role: string | null;
          created_at: string;
          team_id: number | null;
        };
        Insert: {
          user_id: string;
          username: string;
          role?: string | null;
          created_at?: string;
          team_id?: number | null;
        };
        Update: {
          user_id?: string;
          username?: string;
          role?: string | null;
          created_at?: string;
          team_id?: number | null;
        };
      };

      teams: {
        Row: {
          id: number;
          team_name: string;
          team_leader: string | null; // UUID
        };
        Insert: {
          id?: number;
          team_name: string;
          team_leader?: string | null;
        };
        Update: {
          id?: number;
          team_name?: string;
          team_leader?: string | null;
        };
      };

      avatars: {
        Row: {
          avatar_id: number;
          user_id: string;
          avatar_hair: string | null;
          avatar_color: string | null;
          avatar_top: string | null;
          avatar_bottom: string | null;
        };
        Insert: {
          avatar_id?: number;
          user_id: string;
          avatar_hair?: string | null;
          avatar_color?: string | null;
          avatar_top?: string | null;
          avatar_bottom?: string | null;
        };
        Update: {
          avatar_id?: number;
          user_id?: string;
          avatar_hair?: string | null;
          avatar_color?: string | null;
          avatar_top?: string | null;
          avatar_bottom?: string | null;
        };
      };

      user_task_stats: {
        Row: {
          id: number;
          user_id: string;
          date: string; // ISO date
          tasks_done: number;
        };
        Insert: {
          id?: number;
          user_id: string;
          date: string;
          tasks_done: number;
        };
        Update: {
          id?: number;
          user_id?: string;
          date?: string;
          tasks_done?: number;
        };
      };
    };
  };
}
