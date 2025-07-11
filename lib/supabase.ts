import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          xp: number;
          streak: number;
          last_opened: string;
          time_spent: number;
          completed_lessons: number;
          last_activity: string;
          daily_xp_goal: number;
          daily_xp_streak: number;
          perfect_weeks: number;
          weekend_streak: number;
          night_owl_sessions: number;
          early_bird_sessions: number;
          speed_learner_count: number;
          consistent_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          xp?: number;
          streak?: number;
          last_opened?: string;
          time_spent?: number;
          completed_lessons?: number;
          last_activity?: string;
          daily_xp_goal?: number;
          daily_xp_streak?: number;
          perfect_weeks?: number;
          weekend_streak?: number;
          night_owl_sessions?: number;
          early_bird_sessions?: number;
          speed_learner_count?: number;
          consistent_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          xp?: number;
          streak?: number;
          last_opened?: string;
          time_spent?: number;
          completed_lessons?: number;
          last_activity?: string;
          daily_xp_goal?: number;
          daily_xp_streak?: number;
          perfect_weeks?: number;
          weekend_streak?: number;
          night_owl_sessions?: number;
          early_bird_sessions?: number;
          speed_learner_count?: number;
          consistent_days?: number;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
        };
      };
      learning_progress: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          progress: number;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          progress?: number;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          progress?: number;
          completed?: boolean;
          updated_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          earned: boolean;
          earned_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          earned?: boolean;
          earned_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_type?: string;
          title?: string;
          description?: string;
          earned?: boolean;
          earned_at?: string | null;
        };
      };
    };
  };
};