import { supabase } from './supabase';
import { openRouterAPI } from './openrouter';
import type { Database } from './supabase';
import { profileService } from './profile';

type LearningProgressRow = Database['public']['Tables']['learning_progress']['Row'];
type AchievementRow = Database['public']['Tables']['achievements']['Row'];

export interface LearningService {
  updateProgress(userId: string, topic: string, progress: number): Promise<{ success: boolean; error?: string }>;
  getProgress(userId: string): Promise<LearningProgressRow[]>;
  generateLearningPath(topic: string): Promise<string[]>;
  checkAchievements(userId: string): Promise<void>;
  getAchievements(userId: string): Promise<AchievementRow[]>;
  awardXP(userId: string, amount: number): Promise<{ success: boolean; error?: string }>;
  removeLessonProgress(userId: string, topic: string): Promise<{ success: boolean; error?: string }>;
  removeTopicProgress(userId: string, topic: string): Promise<{ success: boolean; error?: string }>;
}

class LearningServiceImpl implements LearningService {
  async updateProgress(userId: string, topic: string, progress: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('learning_progress')
        .upsert({
          user_id: userId,
          topic,
          progress,
          completed: progress >= 100,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,topic'
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Check for achievements after progress update
      await this.checkAchievements(userId);

      // Track lesson completion in profile service
      if (progress >= 100) {
        await profileService.trackLessonCompletion(userId, 15, false); // 15 min default, not under target
      }

      return { success: true };
    } catch (error) {
      console.error('Update progress error:', error);
      return { success: false, error: 'Failed to update progress' };
    }
  }

  async getProgress(userId: string): Promise<LearningProgressRow[]> {
    try {
      const { data, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Get progress error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get progress error:', error);
      return [];
    }
  }

  async generateLearningPath(topic: string): Promise<string[]> {
    try {
      // For now, return predefined paths. In production, use OpenRouter API
      const basePaths = [
        `Introduction to ${topic}`,
        `Core Concepts of ${topic}`,
        `Practical Applications of ${topic}`,
        `Advanced ${topic} Techniques`,
        `${topic} Best Practices`
      ];
      return basePaths;
    } catch (error) {
      console.error('Generate learning path error:', error);
      return [
        'Start with fundamentals',
        'Practice basic concepts',
        'Work on intermediate topics',
        'Apply knowledge in projects',
        'Review and reinforce learning'
      ];
    }
  }

  async checkAchievements(userId: string): Promise<void> {
    try {
      const progress = await this.getProgress(userId);
      const completedLessons = progress.filter(p => p.completed).length;
      
      // Get current profile for XP and streak
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, streak')
        .eq('id', userId)
        .single();

      if (!profile) return;

      const achievements = [
        {
          type: 'first_lesson',
          title: 'First Lesson',
          description: 'Completed your first lesson',
          condition: completedLessons >= 1,
        },
        {
          type: 'knowledge_seeker',
          title: 'Knowledge Seeker',
          description: 'Completed 10 lessons',
          condition: completedLessons >= 10,
        },
        {
          type: 'week_warrior',
          title: 'Week Warrior',
          description: '7-day learning streak',
          condition: profile.streak >= 7,
        },
        {
          type: 'month_champion',
          title: 'Month Champion',
          description: '30-day learning streak',
          condition: profile.streak >= 30,
        },
        {
          type: 'xp_master',
          title: 'XP Master',
          description: 'Earned 1000 XP',
          condition: profile.xp >= 1000,
        },
      ];

      for (const achievement of achievements) {
        if (achievement.condition) {
          await supabase
            .from('achievements')
            .upsert({
              user_id: userId,
              achievement_type: achievement.type,
              title: achievement.title,
              description: achievement.description,
              earned: true,
              earned_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,achievement_type'
            });
        }
      }
    } catch (error) {
      console.error('Check achievements error:', error);
    }
  }

  async getAchievements(userId: string): Promise<AchievementRow[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Get achievements error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get achievements error:', error);
      return [];
    }
  }

  async awardXP(userId: string, amount: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', userId)
        .single();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      const newXP = (profile?.xp || 0) + amount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          xp: newXP,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Check for achievements after XP update
      await this.checkAchievements(userId);

      // Track XP in profile service
      await profileService.trackXpEarned(userId, amount);

      return { success: true };
    } catch (error) {
      console.error('Award XP error:', error);
      return { success: false, error: 'Failed to award XP' };
    }
  }

  async removeLessonProgress(userId: string, topic: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('learning_progress')
        .delete()
        .eq('user_id', userId)
        .eq('topic', topic);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Remove lesson progress error:', error);
      return { success: false, error: 'Failed to remove lesson progress' };
    }
  }

  async removeTopicProgress(userId: string, topic: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('learning_progress')
        .delete()
        .eq('user_id', userId)
        .ilike('topic', `${topic}:%`);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Remove topic progress error:', error);
      return { success: false, error: 'Failed to remove topic progress' };
    }
  }
}

export const learningService = new LearningServiceImpl();