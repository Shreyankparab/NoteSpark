import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// AI Provider types
export type AIProvider = 'openai' | 'gemini';

// Storage keys
const AI_PROVIDER_KEY = 'notespark_ai_provider';
const OPENAI_CREDITS_KEY = 'notespark_openai_credits';

// Default values
const DEFAULT_PROVIDER: AIProvider = 'gemini';
const DEFAULT_OPENAI_CREDITS = 100; // Example credit limit

// API Keys
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Interface for AI processing options
interface AIProcessingOptions {
  content: string;
  type: 'summarize' | 'enhance';
}

/**
 * AI Service for handling text processing with OpenAI and Gemini
 */
class AIService {
  private currentProvider: AIProvider = DEFAULT_PROVIDER;
  private openaiCredits: number = DEFAULT_OPENAI_CREDITS;

  constructor() {
    this.loadSettings();
  }

  /**
   * Load saved settings from AsyncStorage
   */
  private async loadSettings() {
    try {
      const [providerValue, creditsValue] = await Promise.all([
        AsyncStorage.getItem(AI_PROVIDER_KEY),
        AsyncStorage.getItem(OPENAI_CREDITS_KEY)
      ]);

      if (providerValue) {
        this.currentProvider = providerValue as AIProvider;
      }

      if (creditsValue) {
        this.openaiCredits = parseInt(creditsValue, 10);
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  }

  /**
   * Save current settings to AsyncStorage
   */
  private async saveSettings() {
    try {
      await Promise.all([
        AsyncStorage.setItem(AI_PROVIDER_KEY, this.currentProvider),
        AsyncStorage.setItem(OPENAI_CREDITS_KEY, this.openaiCredits.toString())
      ]);
    } catch (error) {
      console.error('Error saving AI settings:', error);
    }
  }

  /**
   * Get current AI provider
   */
  public getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }

  /**
   * Set AI provider manually
   */
  public async setProvider(provider: AIProvider): Promise<void> {
    this.currentProvider = provider;
    await this.saveSettings();
  }

  /**
   * Get remaining OpenAI credits
   */
  public getOpenAICredits(): number {
    return this.openaiCredits;
  }

  /**
   * Process text with AI (summarize or enhance)
   */
  public async processText(options: AIProcessingOptions): Promise<string> {
    // Check if OpenAI has credits and switch to Gemini if needed
    if (this.currentProvider === 'openai' && this.openaiCredits <= 0) {
      this.currentProvider = 'gemini';
      await this.saveSettings();
      Alert.alert(
        'Switched to Gemini',
        'You\'ve run out of OpenAI credits. NoteSpark has automatically switched to Gemini.'
      );
    }

    // Process with selected provider
    try {
      let result: string;

      if (this.currentProvider === 'openai') {
        result = await this.processWithOpenAI(options);
        // Decrease credits after successful processing
        this.openaiCredits -= 1;
        await this.saveSettings();
      } else {
        result = await this.processWithGemini(options);
      }

      return result;
    } catch (error) {
      console.error(`Error processing with ${this.currentProvider}:`, error);

      // If OpenAI fails, try Gemini as fallback
      if (this.currentProvider === 'openai') {
        this.currentProvider = 'gemini';
        await this.saveSettings();
        Alert.alert(
          'Switched to Gemini',
          'There was an issue with OpenAI. NoteSpark has automatically switched to Gemini.'
        );
        return this.processWithGemini(options);
      }

      throw error;
    }
  }

  /**
   * Process text with OpenAI
   */
  private async processWithOpenAI(options: AIProcessingOptions): Promise<string> {
    // In a real implementation, you would call the OpenAI API here
    // This is a simulation for demonstration purposes

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Non-templated fallback to avoid repetitive outputs when OpenAI path is used
    const sentences = options.content.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (options.type === 'summarize') {
      const take = Math.max(1, Math.min(5, Math.ceil(sentences.length / 3)));
      return sentences.slice(0, take).join(' ');
    } else {
      const excerpt = sentences.slice(0, 3).join(' ');
      const topic = this.extractTopic(options.content.slice(0, 140));
      return `${excerpt}\n\nInsight: A key factor in ${topic.toLowerCase()} is clarifying objectives and constraints before execution.`;
    }
  }

  /**
   * Extract the main topic from content
   */
  private extractTopic(content: string): string {
    // Simple extraction of potential topic from first sentence
    const firstSentence = content.split('.')[0] || content;
    const words = firstSentence.split(' ');

    // Look for capitalized words that might be topics
    const potentialTopics = words.filter(word =>
      word.length > 3 &&
      word[0] === word[0].toUpperCase() &&
      !['The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'Why', 'How', 'What'].includes(word)
    );

    if (potentialTopics.length > 0) {
      return potentialTopics[0].replace(/[^a-zA-Z ]/g, '');
    }

    // Fallback to first two words if no capitalized words found
    return (words.slice(0, 2).join(' ') || 'The topic').replace(/[^a-zA-Z ]/g, '');
  }

  /**
   * Process text with Gemini
   */
  private async processWithGemini(options: AIProcessingOptions): Promise<string> {
    try {
      // Real Gemini API implementation using the API key
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      const url = `${endpoint}?key=${GEMINI_API_KEY}`;

      const prompt = options.type === 'summarize'
        ? `You are a precise editor. Summarize faithfully in 3-7 bullet points. Do not invent facts. If the text is too short, noisy, or lacks meaning, respond: "Insufficient content to summarize." Text:\n\n${options.content}`
        : `You are an expert writing coach. Improve clarity, cohesion, and depth without changing meaning. Expand with 1-2 brief, concrete insights tied to the text. Do not fabricate facts. If the text is too short, respond: "Insufficient content to enhance." Text:\n\n${options.content}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            topP: 0.9,
            maxOutputTokens: 768,
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
      }

      const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() || '';
      return result || (options.type === 'summarize' ? 'Insufficient content to summarize.' : options.content);
    } catch (error) {
      console.error('Error calling Gemini API:', error);

      // Fallback: simple extractive summary/enhancement to avoid templated outputs
      const sentences = options.content.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (options.type === 'summarize') {
        const take = Math.max(1, Math.min(5, Math.ceil(sentences.length / 3)));
        return sentences.slice(0, take).map(s => `• ${s}`).join('\n');
      } else {
        const excerpt = sentences.slice(0, 3).join(' ');
        const topic = this.extractTopic(options.content.slice(0, 140));
        return `${excerpt}\n\nInsight: Consider edge cases and assumptions when working with ${topic.toLowerCase()}.`;
      }
    }
  }
}

// Export a singleton instance
export const aiService = new AIService();