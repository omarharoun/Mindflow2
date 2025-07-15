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
  removeTopicProgress(userId: string, topic: string, deleted: boolean): Promise<{ success: boolean; error?: string }>;
  getLesson(lessonId: string): Promise<any | null>;
  saveLesson(lessonId: string, title: string, content: any): Promise<{ success: boolean; error?: string }>;
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

  async generateLearningPath(topic: string, setDebugInfo?: (info: {error?: string, aiResponse?: string}) => void): Promise<string[]> {
    try {
      const aiPrompt = `Generate a creative, logical learning path for the topic: "${topic}". Return a JSON array of 5-7 unique, engaging lesson titles. Example: [\"Lesson 1 title\", \"Lesson 2 title\", ...]`;
      const aiResponse = await openRouterAPI.generateResponse([
        { role: 'user', content: aiPrompt }
      ]);
      if (setDebugInfo) setDebugInfo({ aiResponse });
      let titles: string[] = [];
      try {
        const cleanedResponse = stripCodeBlock(aiResponse);
        const parsed = JSON.parse(cleanedResponse);
        if (Array.isArray(parsed) && parsed.every(t => typeof t === 'string')) {
          titles = parsed;
        } else if (parsed.path && Array.isArray(parsed.path)) {
          titles = parsed.path;
        } else {
          throw new Error('AI did not return a valid array of titles');
        }
      } catch (err) {
        // Try to extract the largest valid JSON array from a truncated or verbose response
        const cleanedResponse = stripCodeBlock(aiResponse);
        const extracted = extractLargestValidJsonArray(cleanedResponse);
        if (extracted && Array.isArray(extracted) && extracted.every(t => typeof t === 'string')) {
          titles = extracted;
        } else {
          // Fallback: extract all complete objects as lesson titles (if possible)
          const objects = extractAllCompleteObjects(cleanedResponse);
          if (objects.length > 0 && objects.every(obj => typeof obj.title === 'string')) {
            titles = objects.map(obj => obj.title);
          } else {
            // Final fallback: try NDJSON extraction
            const ndjsonObjects = extractNDJSON(cleanedResponse);
            if (ndjsonObjects.length > 0 && ndjsonObjects.every(obj => typeof obj.title === 'string')) {
              titles = ndjsonObjects.map(obj => obj.title);
            } else {
              // Last resort: try to extract a single object
              const singleObj = extractSingleObject(cleanedResponse);
              if (singleObj && typeof singleObj.title === 'string') {
                titles = [singleObj.title];
              } else {
                if (setDebugInfo) setDebugInfo({ error: String(err), aiResponse });
                // fallback
                titles = [
                  `Introduction to ${topic}`,
                  `Core Concepts of ${topic}`,
                  `Applications of ${topic}`,
                  `Challenges in ${topic}`,
                  `Future of ${topic}`
                ];
              }
            }
          }
        }
      }
      return titles;
    } catch (error) {
      if (setDebugInfo) setDebugInfo({ error: String(error) });
      return [
        `Introduction to ${topic}`,
        `Core Concepts of ${topic}`,
        `Applications of ${topic}`,
        `Challenges in ${topic}`,
        `Future of ${topic}`
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
      console.log('[removeLessonProgress] userId:', userId, 'topic:', topic);
      const { error } = await supabase
        .from('learning_progress')
        .delete()
        .eq('user_id', userId)
        .eq('topic', topic);
      if (error) {
        console.error('[removeLessonProgress] error:', error);
        return { success: false, error: error.message };
      }
      console.log('[removeLessonProgress] success');
      return { success: true };
    } catch (error) {
      console.error('Remove lesson progress error:', error);
      return { success: false, error: 'Failed to remove lesson progress' };
    }
  }

  async removeTopicProgress(userId: string, topic: string, deleted: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[removeTopicProgress] userId:', userId, 'topic:', topic, 'deleted:', deleted);
      // Soft delete or restore: update the deleted flag
      const { error } = await supabase
        .from('learning_progress')
        .update({ deleted })
        .eq('user_id', userId)
        .or(`topic.ilike.${topic}:% , topic.eq.${topic}`);
      if (error) {
        console.error('[removeTopicProgress] error:', error);
        return { success: false, error: error.message };
      }
      console.log('[removeTopicProgress] success');
      return { success: true };
    } catch (error) {
      console.error('Remove topic progress error:', error);
      return { success: false, error: 'Failed to update topic deleted flag' };
    }
  }

  // Fetch a shared lesson by lessonId
  async getLesson(lessonId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      if (error || !data) {
        return null;
      }
      return data.content;
    } catch (error) {
      console.error('Get lesson error:', error);
      return null;
    }
  }

  // Save a shared lesson (overwrites if exists)
  async saveLesson(lessonId: string, title: string, content: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('lessons')
        .upsert({
          id: lessonId,
          title,
          content,
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Save lesson error:', error);
      return { success: false, error: 'Failed to save lesson' };
    }
  }
}

// Utility to extract the largest valid JSON array from a string (even if truncated)
function extractLargestValidJsonArray(text: string): any[] | null {
  const start = text.indexOf('[');
  if (start === -1) return null;
  let end = text.length;
  while (end > start) {
    try {
      return JSON.parse(text.slice(start, end));
    } catch {
      end--;
    }
  }
  return null;
}

// Utility to extract all complete JSON objects from a truncated array
function extractAllCompleteObjects(text: string): any[] {
  const objects = [];
  const regex = /{[^}]*}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      objects.push(JSON.parse(match[0]));
    } catch {
      // skip invalid objects
    }
  }
  return objects;
}

// Utility to extract NDJSON (newline-delimited JSON objects)
function extractNDJSON(text: string): any[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('{') && line.endsWith('}'))
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(obj => obj !== null);
}

// Utility to extract a single JSON object from a string
function extractSingleObject(text: string): any | null {
  const match = text.match(/{[\s\S]*}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  return null;
}

// Utility to strip code block wrappers from AI response
function stripCodeBlock(text: string): string {
  return text.replace(/^```json\s*|```$/gmi, '').trim();
}

export const learningService = new LearningServiceImpl();