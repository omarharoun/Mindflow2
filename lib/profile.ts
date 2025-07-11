import { supabase } from './supabase';
import type { Database } from './supabase';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type AchievementRow = Database['public']['Tables']['achievements']['Row'];

export interface ProfileMetrics {
  streak: number;
  xp: number;
  timeSpent: number; // in minutes
  completedLessons: number;
  lastActivity: string;
  dailyXpGoal: number;
  dailyXpStreak: number;
  perfectWeeks: number;
  weekendStreak: number;
  nightOwlSessions: number;
  earlyBirdSessions: number;
  speedLearnerCount: number;
  consistentDays: number;
}

export interface Achievement {
  id: string;
  type: string;
  category: 'learning' | 'xp' | 'special';
  title: string;
  description: string;
  icon: string;
  requirement: number;
  earned: boolean;
  earnedAt?: string;
  progress: number;
}

export interface ProfileService {
  updateMetrics(userId: string, updates: Partial<ProfileMetrics>): Promise<{ success: boolean; error?: string }>;
  getMetrics(userId: string): Promise<ProfileMetrics | null>;
  trackLessonCompletion(userId: string, lessonDuration: number, completedUnderTarget: boolean): Promise<void>;
  trackXpEarned(userId: string, xpAmount: number): Promise<void>;
  trackTimeSpent(userId: string, minutes: number): Promise<void>;
  updateStreak(userId: string): Promise<void>;
  checkAchievements(userId: string): Promise<Achievement[]>;
  getAchievements(userId: string): Promise<Achievement[]>;
  trackSessionTime(userId: string): Promise<void>;
}

const ACHIEVEMENTS_CONFIG: Omit<Achievement, 'id' | 'earned' | 'earnedAt' | 'progress'>[] = [
  // Learning Milestones
  { type: 'first_lesson', category: 'learning', title: 'First Steps', description: 'Complete your first lesson', icon: '🎯', requirement: 1 },
  { type: 'lessons_10', category: 'learning', title: 'Getting Started', description: 'Complete 10 lessons', icon: '📚', requirement: 10 },
  { type: 'lessons_50', category: 'learning', title: 'Knowledge Seeker', description: 'Complete 50 lessons', icon: '🔍', requirement: 50 },
  { type: 'lessons_100', category: 'learning', title: 'Dedicated Learner', description: 'Complete 100 lessons', icon: '🎓', requirement: 100 },
  { type: 'lessons_500', category: 'learning', title: 'Master Student', description: 'Complete 500 lessons', icon: '👑', requirement: 500 },
  
  { type: 'streak_7', category: 'learning', title: 'Week Warrior', description: 'Maintain a 7-day learning streak', icon: '🔥', requirement: 7 },
  { type: 'streak_30', category: 'learning', title: 'Month Champion', description: 'Maintain a 30-day learning streak', icon: '🏆', requirement: 30 },
  { type: 'streak_90', category: 'learning', title: 'Quarter Master', description: 'Maintain a 90-day learning streak', icon: '💎', requirement: 90 },
  { type: 'streak_365', category: 'learning', title: 'Year Legend', description: 'Maintain a 365-day learning streak', icon: '🌟', requirement: 365 },
  
  { type: 'time_1h', category: 'learning', title: 'First Hour', description: 'Spend 1 hour learning', icon: '⏰', requirement: 60 },
  { type: 'time_10h', category: 'learning', title: 'Time Investor', description: 'Spend 10 hours learning', icon: '⏳', requirement: 600 },
  { type: 'time_50h', category: 'learning', title: 'Dedicated Scholar', description: 'Spend 50 hours learning', icon: '📖', requirement: 3000 },
  { type: 'time_100h', category: 'learning', title: 'Learning Machine', description: 'Spend 100 hours learning', icon: '🤖', requirement: 6000 },
  
  // XP Achievements
  { type: 'xp_100', category: 'xp', title: 'XP Starter', description: 'Earn 100 XP', icon: '⭐', requirement: 100 },
  { type: 'xp_500', category: 'xp', title: 'XP Collector', description: 'Earn 500 XP', icon: '🌟', requirement: 500 },
  { type: 'xp_1000', category: 'xp', title: 'XP Master', description: 'Earn 1,000 XP', icon: '💫', requirement: 1000 },
  { type: 'xp_5000', category: 'xp', title: 'XP Legend', description: 'Earn 5,000 XP', icon: '🚀', requirement: 5000 },
  { type: 'xp_10000', category: 'xp', title: 'XP Grandmaster', description: 'Earn 10,000 XP', icon: '👑', requirement: 10000 },
  
  { type: 'daily_xp_10', category: 'xp', title: 'Goal Getter', description: 'Meet daily XP goal 10 times', icon: '🎯', requirement: 10 },
  { type: 'daily_xp_50', category: 'xp', title: 'Consistent Achiever', description: 'Meet daily XP goal 50 times', icon: '🏅', requirement: 50 },
  { type: 'daily_xp_100', category: 'xp', title: 'Goal Master', description: 'Meet daily XP goal 100 times', icon: '🏆', requirement: 100 },
  
  { type: 'perfect_week', category: 'xp', title: 'Perfect Week', description: 'Hit XP goal 7 days in a row', icon: '💯', requirement: 1 },
  
  // Special Achievements
  { type: 'speed_learner', category: 'special', title: 'Speed Learner', description: 'Complete 10 lessons under target time', icon: '⚡', requirement: 10 },
  { type: 'consistent_learner', category: 'special', title: 'Consistent Learner', description: 'Log in same time daily for 14 days', icon: '🕐', requirement: 14 },
  { type: 'weekend_warrior', category: 'special', title: 'Weekend Warrior', description: 'Complete lessons on 5 consecutive weekends', icon: '🏖️', requirement: 5 },
  { type: 'night_owl', category: 'special', title: 'Night Owl', description: 'Complete 20 lessons after 10 PM', icon: '🦉', requirement: 20 },
  { type: 'early_bird', category: 'special', title: 'Early Bird', description: 'Complete 20 lessons before 8 AM', icon: '🐦', requirement: 20 },
];

// In-memory cache for achievements
const achievementsCache: { [userId: string]: { data: Achievement[]; timestamp: number } } = {};

class ProfileServiceImpl implements ProfileService {
  async updateMetrics(userId: string, updates: Partial<ProfileMetrics>): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert camelCase keys to snake_case for Supabase
      const convertToSnakeCase = (obj: any) => {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          converted[snakeKey] = value;
        }
        return converted;
      };

      const snakeCaseUpdates = convertToSnakeCase(updates);

      const { error } = await supabase
        .from('profiles')
        .update({
          ...snakeCaseUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Update metrics error:', error);
      return { success: false, error: 'Failed to update metrics' };
    }
  }

  async getMetrics(userId: string): Promise<ProfileMetrics | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        streak: data.streak || 0,
        xp: data.xp || 0,
        timeSpent: data.time_spent || 0,
        completedLessons: data.completed_lessons || 0,
        lastActivity: data.last_activity || new Date().toISOString(),
        dailyXpGoal: data.daily_xp_goal || 50,
        dailyXpStreak: data.daily_xp_streak || 0,
        perfectWeeks: data.perfect_weeks || 0,
        weekendStreak: data.weekend_streak || 0,
        nightOwlSessions: data.night_owl_sessions || 0,
        earlyBirdSessions: data.early_bird_sessions || 0,
        speedLearnerCount: data.speed_learner_count || 0,
        consistentDays: data.consistent_days || 0,
      };
    } catch (error) {
      console.error('Get metrics error:', error);
      return null;
    }
  }

  async trackLessonCompletion(userId: string, lessonDuration: number, completedUnderTarget: boolean): Promise<void> {
    try {
      const metrics = await this.getMetrics(userId);
      if (!metrics) return;

      const now = new Date();
      const hour = now.getHours();
      
      const updates: Partial<ProfileMetrics> = {
        completedLessons: metrics.completedLessons + 1,
        timeSpent: metrics.timeSpent + lessonDuration,
        lastActivity: now.toISOString(),
      };

      // Track special achievements
      if (completedUnderTarget) {
        updates.speedLearnerCount = metrics.speedLearnerCount + 1;
      }

      if (hour >= 22 || hour < 6) { // Night owl (10 PM - 6 AM)
        updates.nightOwlSessions = metrics.nightOwlSessions + 1;
      }

      if (hour >= 5 && hour < 8) { // Early bird (5 AM - 8 AM)
        updates.earlyBirdSessions = metrics.earlyBirdSessions + 1;
      }

      // Check weekend warrior
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        const lastWeekend = new Date(metrics.lastActivity);
        const daysSinceLastActivity = Math.floor((now.getTime() - lastWeekend.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastActivity <= 7) {
          updates.weekendStreak = metrics.weekendStreak + 1;
        } else {
          updates.weekendStreak = 1;
        }
      }

      await this.updateMetrics(userId, updates);
      await this.updateStreak(userId);
      await this.checkAchievements(userId);
    } catch (error) {
      console.error('Track lesson completion error:', error);
    }
  }

  async trackXpEarned(userId: string, xpAmount: number): Promise<void> {
    try {
      const metrics = await this.getMetrics(userId);
      if (!metrics) return;

      const newXp = metrics.xp + xpAmount;
      const today = new Date().toISOString().slice(0, 10);
      const lastActivityDate = new Date(metrics.lastActivity).toISOString().slice(0, 10);

      // Check if daily XP goal is met
      const dailyXpEarned = today === lastActivityDate ? xpAmount : xpAmount; // Simplified for demo
      let dailyXpStreak = metrics.dailyXpStreak;
      let perfectWeeks = metrics.perfectWeeks;

      if (dailyXpEarned >= metrics.dailyXpGoal) {
        dailyXpStreak += 1;
        
        // Check for perfect week (7 consecutive days)
        if (dailyXpStreak % 7 === 0) {
          perfectWeeks += 1;
        }
      }

      await this.updateMetrics(userId, {
        xp: newXp,
        dailyXpStreak,
        perfectWeeks,
        lastActivity: new Date().toISOString(),
      });

      await this.checkAchievements(userId);
    } catch (error) {
      console.error('Track XP earned error:', error);
    }
  }

  async trackTimeSpent(userId: string, minutes: number): Promise<void> {
    try {
      const metrics = await this.getMetrics(userId);
      if (!metrics) return;

      await this.updateMetrics(userId, {
        timeSpent: metrics.timeSpent + minutes,
        lastActivity: new Date().toISOString(),
      });

      await this.checkAchievements(userId);
    } catch (error) {
      console.error('Track time spent error:', error);
    }
  }

  async updateStreak(userId: string): Promise<void> {
    try {
      const metrics = await this.getMetrics(userId);
      if (!metrics) return;

      const now = new Date();
      const lastActivity = new Date(metrics.lastActivity);
      const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      let newStreak = metrics.streak;

      if (daysDiff === 0) {
        // Same day, maintain streak
        newStreak = metrics.streak;
      } else if (daysDiff === 1) {
        // Next day, increment streak
        newStreak = metrics.streak + 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }

      await this.updateMetrics(userId, {
        streak: newStreak,
        lastActivity: now.toISOString(),
      });

      await this.checkAchievements(userId);
    } catch (error) {
      console.error('Update streak error:', error);
    }
  }

  async trackSessionTime(userId: string): Promise<void> {
    try {
      const metrics = await this.getMetrics(userId);
      if (!metrics) return;

      const now = new Date();
      const lastActivity = new Date(metrics.lastActivity);
      const sameTimeWindow = Math.abs(now.getHours() - lastActivity.getHours()) <= 1;
      const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      let consistentDays = metrics.consistentDays;

      if (daysDiff === 1 && sameTimeWindow) {
        consistentDays += 1;
      } else if (daysDiff > 1 || !sameTimeWindow) {
        consistentDays = 1;
      }

      await this.updateMetrics(userId, {
        consistentDays,
        lastActivity: now.toISOString(),
      });

      await this.checkAchievements(userId);
    } catch (error) {
      console.error('Track session time error:', error);
    }
  }

  async checkAchievements(userId: string): Promise<Achievement[]> {
    try {
      const metrics = await this.getMetrics(userId);
      if (!metrics) return [];

      const newAchievements: Achievement[] = [];

      for (const config of ACHIEVEMENTS_CONFIG) {
        let currentValue = 0;
        let isEarned = false;

        // Calculate current progress based on achievement type
        switch (config.type) {
          case 'first_lesson':
          case 'lessons_10':
          case 'lessons_50':
          case 'lessons_100':
          case 'lessons_500':
            currentValue = metrics.completedLessons;
            break;
          case 'streak_7':
          case 'streak_30':
          case 'streak_90':
          case 'streak_365':
            currentValue = metrics.streak;
            break;
          case 'time_1h':
          case 'time_10h':
          case 'time_50h':
          case 'time_100h':
            currentValue = metrics.timeSpent;
            break;
          case 'xp_100':
          case 'xp_500':
          case 'xp_1000':
          case 'xp_5000':
          case 'xp_10000':
            currentValue = metrics.xp;
            break;
          case 'daily_xp_10':
          case 'daily_xp_50':
          case 'daily_xp_100':
            currentValue = metrics.dailyXpStreak;
            break;
          case 'perfect_week':
            currentValue = metrics.perfectWeeks;
            break;
          case 'speed_learner':
            currentValue = metrics.speedLearnerCount;
            break;
          case 'consistent_learner':
            currentValue = metrics.consistentDays;
            break;
          case 'weekend_warrior':
            currentValue = metrics.weekendStreak;
            break;
          case 'night_owl':
            currentValue = metrics.nightOwlSessions;
            break;
          case 'early_bird':
            currentValue = metrics.earlyBirdSessions;
            break;
        }

        isEarned = currentValue >= config.requirement;
        const progress = Math.min((currentValue / config.requirement) * 100, 100);

        const achievement: Achievement = {
          id: `${userId}_${config.type}`,
          ...config,
          earned: isEarned,
          progress,
        };

        // Save to database if newly earned
        if (isEarned) {
          const { data: existing } = await supabase
            .from('achievements')
            .select('*')
            .eq('user_id', userId)
            .eq('achievement_type', config.type)
            .single();

          if (!existing) {
            await supabase
              .from('achievements')
              .insert({
                user_id: userId,
                achievement_type: config.type,
                title: config.title,
                description: config.description,
                earned: true,
                earned_at: new Date().toISOString(),
              });

            newAchievements.push(achievement);
          }
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Check achievements error:', error);
      return [];
    }
  }

  async getAchievements(userId: string, forceRefresh = false): Promise<Achievement[]> {
    // Check cache first
    const cache = achievementsCache[userId];
    const now = Date.now();
    if (!forceRefresh && cache && now - cache.timestamp < 5 * 60 * 1000) {
      return cache.data;
    }
    try {
      const metrics = await this.getMetrics(userId);
      if (!metrics) return [];

      const achievements: Achievement[] = [];

      for (const config of ACHIEVEMENTS_CONFIG) {
        let currentValue = 0;
        let isEarned = false;

        // Calculate current progress (same logic as checkAchievements)
        switch (config.type) {
          case 'first_lesson':
          case 'lessons_10':
          case 'lessons_50':
          case 'lessons_100':
          case 'lessons_500':
            currentValue = metrics.completedLessons;
            break;
          case 'streak_7':
          case 'streak_30':
          case 'streak_90':
          case 'streak_365':
            currentValue = metrics.streak;
            break;
          case 'time_1h':
          case 'time_10h':
          case 'time_50h':
          case 'time_100h':
            currentValue = metrics.timeSpent;
            break;
          case 'xp_100':
          case 'xp_500':
          case 'xp_1000':
          case 'xp_5000':
          case 'xp_10000':
            currentValue = metrics.xp;
            break;
          case 'daily_xp_10':
          case 'daily_xp_50':
          case 'daily_xp_100':
            currentValue = metrics.dailyXpStreak;
            break;
          case 'perfect_week':
            currentValue = metrics.perfectWeeks;
            break;
          case 'speed_learner':
            currentValue = metrics.speedLearnerCount;
            break;
          case 'consistent_learner':
            currentValue = metrics.consistentDays;
            break;
          case 'weekend_warrior':
            currentValue = metrics.weekendStreak;
            break;
          case 'night_owl':
            currentValue = metrics.nightOwlSessions;
            break;
          case 'early_bird':
            currentValue = metrics.earlyBirdSessions;
            break;
        }

        isEarned = currentValue >= config.requirement;
        const progress = Math.min((currentValue / config.requirement) * 100, 100);

        // Get earned date from database
        const { data: dbAchievement } = await supabase
          .from('achievements')
          .select('earned_at')
          .eq('user_id', userId)
          .eq('achievement_type', config.type)
          .single();

        achievements.push({
          id: `${userId}_${config.type}`,
          ...config,
          earned: isEarned,
          earnedAt: dbAchievement?.earned_at,
          progress,
        });
      }

      // Cache the result
      achievementsCache[userId] = { data: achievements, timestamp: now };

      return achievements.sort((a, b) => {
        if (a.earned && !b.earned) return -1;
        if (!a.earned && b.earned) return 1;
        return b.progress - a.progress;
      });
    } catch (error) {
      console.error('Get achievements error:', error);
      return [];
    }
  }
}

export const profileService = new ProfileServiceImpl();