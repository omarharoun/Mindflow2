import { supabase } from './supabase';
import { profileService } from './profile';
import type { Database } from './supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  xp: number;
  streak: number;
  last_opened: string;
  level: number;
  timeSpent: number;
  completedLessons: number;
}

type AuthListener = (user: AuthUser | null) => void;

class AuthManager {
  private user: AuthUser | null = null;
  private listeners: AuthListener[] = [];
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private authSubscription: any = null;

  async init(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.initialized) {
      return Promise.resolve();
    }

    this.initPromise = new Promise(async (resolve) => {
      try {
        // Set up auth state change listener only once
        if (!this.authSubscription) {
          this.authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              await this.createOrUpdateProfile(session.user);
            } else if (event === 'SIGNED_OUT') {
              this.user = null;
              this.notifyListeners();
            }
          });
        }

        // Get current session and load user profile if exists
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            this.user = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              xp: profile.xp,
              streak: profile.streak,
              last_opened: profile.last_opened,
              level: Math.floor(profile.xp / 250) + 1,
              timeSpent: profile.time_spent || 0,
              completedLessons: profile.completed_lessons || 0,
            };
            
            // Track session time for consistency achievements
            await profileService.trackSessionTime(profile.id);
          }
        }
        
        this.notifyListeners();
        this.initialized = true;
        resolve();
      } catch (error) {
        console.error('Auth initialization error:', error);
        this.initialized = true;
        resolve();
      }
    });

    return this.initPromise;
  }

  private async createOrUpdateProfile(user: any): Promise<void> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        this.user = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          xp: profile.xp,
          streak: profile.streak,
          last_opened: profile.last_opened,
          level: Math.floor(profile.xp / 250) + 1,
          timeSpent: profile.time_spent || 0,
          completedLessons: profile.completed_lessons || 0,
        };
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error creating/updating profile:', error);
    }
  }

  subscribe(listener: AuthListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.user));
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }
      
      const user: AuthUser = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        xp: profile.xp,
        streak: profile.streak,
        last_opened: profile.last_opened,
        level: Math.floor(profile.xp / 250) + 1,
        timeSpent: profile.time_spent || 0,
        completedLessons: profile.completed_lessons || 0,
      };

      this.user = user;
      this.notifyListeners();
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: 'Sign in failed' };
    }
  }

  async signUp(email: string, password: string, name: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned' };
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          name,
          xp: 0,
          streak: 0,
          last_opened: new Date().toISOString().slice(0, 10),
        });

      if (profileError) {
        return { success: false, error: profileError.message };
      }
      
      const user: AuthUser = {
        id: data.user.id,
        email,
        name,
        xp: 0,
        streak: 0,
        last_opened: new Date().toISOString().slice(0, 10),
        level: 1,
        timeSpent: 0,
        completedLessons: 0,
      };

      this.user = user;
      this.notifyListeners();
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: 'Sign up failed' };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      this.user = null;
      this.notifyListeners();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Sign out failed' };
    }
  }

  async updateUser(updates: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.user) {
        return { success: false, error: 'No user signed in' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      this.user = { ...this.user, ...updates };
      this.notifyListeners();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Update failed' };
    }
  }
}

export const authManager = new AuthManager();