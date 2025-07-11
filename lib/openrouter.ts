const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

if (!OPENROUTER_API_KEY) {
  throw new Error('Missing OpenRouter API key');
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = OPENROUTER_API_KEY;
    this.baseUrl = OPENROUTER_BASE_URL;
  }

  async generateResponse(
    messages: ChatMessage[],
    model: string = 'anthropic/claude-3.5-sonnet'
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mindflow-app.com',
          'X-Title': 'MindFlow Learning App',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are Nova, an AI learning assistant for MindFlow, a mobile learning platform. You help users learn new topics by:
              
              1. Breaking down complex concepts into digestible parts
              2. Providing clear explanations with examples
              3. Suggesting learning paths and resources
              4. Encouraging users and tracking their progress
              5. Adapting to different learning styles
              
              Keep responses concise but helpful, and always maintain an encouraging, friendly tone. Focus on practical learning advice and actionable next steps.`
            },
            ...messages
          ],
          max_tokens: 500,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data: OpenRouterResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenRouter API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateLearningPath(topic: string): Promise<string[]> {
    try {
      const response = await this.generateResponse([
        {
          role: 'user',
          content: `Create a structured learning path for "${topic}". Provide 5-7 specific steps or subtopics that would help someone learn this effectively. Return only the list items, one per line.`
        }
      ]);

      return response
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
        .filter(item => item.length > 0);
    } catch (error) {
      console.error('Error generating learning path:', error);
      return [
        'Start with fundamentals',
        'Practice basic concepts',
        'Work on intermediate topics',
        'Apply knowledge in projects',
        'Review and reinforce learning'
      ];
    }
  }
}

export const openRouterAPI = new OpenRouterAPI();