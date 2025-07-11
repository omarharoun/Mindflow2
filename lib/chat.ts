import { supabase } from './supabase';
import { openRouterAPI, type ChatMessage } from './openrouter';
import type { Database } from './supabase';

type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];

export interface ChatService {
  sendMessage(userId: string, content: string): Promise<{ success: boolean; response?: string; error?: string }>;
  getChatHistory(userId: string, limit?: number): Promise<ChatMessageRow[]>;
  clearChatHistory(userId: string): Promise<{ success: boolean; error?: string }>;
}

class ChatServiceImpl implements ChatService {
  async sendMessage(userId: string, content: string): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      // Save user message
      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          role: 'user',
          content,
        });

      if (userMessageError) {
        return { success: false, error: userMessageError.message };
      }

      // Get recent chat history for context
      const recentMessages = await this.getChatHistory(userId, 10);
      
      // Prepare messages for AI
      const messages: ChatMessage[] = recentMessages
        .slice(-9) // Keep last 9 messages for context
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      // Add current user message
      messages.push({
        role: 'user',
        content,
      });

      // Generate AI response
      const aiResponse = await openRouterAPI.generateResponse(messages);

      // Save AI response
      const { error: aiMessageError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          role: 'assistant',
          content: aiResponse,
        });

      if (aiMessageError) {
        return { success: false, error: aiMessageError.message };
      }

      return { success: true, response: aiResponse };
    } catch (error) {
      console.error('Chat service error:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  async getChatHistory(userId: string, limit: number = 50): Promise<ChatMessageRow[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching chat history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Chat history error:', error);
      return [];
    }
  }

  async clearChatHistory(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Clear chat history error:', error);
      return { success: false, error: 'Failed to clear chat history' };
    }
  }
}

export const chatService = new ChatServiceImpl();