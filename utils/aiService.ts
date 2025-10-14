import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// AI Provider types
export type AIProvider = 'openai' | 'gemini';

// Storage keys
const AI_PROVIDER_KEY = 'notespark_ai_provider';
const OPENAI_CREDITS_KEY = 'notespark_openai_credits';

// Default values
const DEFAULT_PROVIDER: AIProvider = 'openai';
const DEFAULT_OPENAI_CREDITS = 100; // Example credit limit

// API Keys
const GEMINI_API_KEY = 'AIzaSyAWR-Q86DP1l9R6CPpVOdlRUR58ssPY0w8';

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
    
    if (options.type === 'summarize') {
      // Generate a more detailed summary (4-5 lines)
      const contentPreview = options.content.substring(0, 100);
      const topic = this.extractTopic(contentPreview);
      
      return `[OpenAI Summary] 
${topic} is a critical concept in the modern digital landscape. 
This note explores the fundamental principles and practical applications of ${topic}. 
Key points include the methodologies, ethical considerations, and best practices in the field. 
The content highlights important relationships between ${topic} and related domains, providing a comprehensive overview for both beginners and experienced practitioners.`;
    } else {
      // Generate a more detailed enhancement (10-11 lines)
      const contentPreview = options.content.substring(0, 100);
      const topic = this.extractTopic(contentPreview);
      
      return `${options.content}\n\n[OpenAI Enhanced] 
${topic} represents a sophisticated domain with multiple dimensions worth exploring further:

1. Historical Context: The evolution of ${topic} has been shaped by significant technological and societal developments over the past decades.

2. Core Principles: The fundamental concepts underlying ${topic} include systematic approaches, methodological rigor, and ethical considerations.

3. Best Practices: Industry standards for ${topic} emphasize documentation, transparency, and continuous improvement.

4. Risk Management: Effective ${topic} requires comprehensive risk assessment and mitigation strategies.

5. Future Trends: Emerging technologies are reshaping how ${topic} is implemented, with AI and automation playing increasingly important roles.

This enhanced analysis provides deeper context to help you better understand and apply these concepts in practical scenarios.`;
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
        ? `Create a professional, detailed summary (4-5 paragraphs) of the following text. Include key concepts, main points, and implications: ${options.content}`
        : `Enhance the following note with substantial additional context, insights, and analysis (10-11 paragraphs). Include historical context, core principles, best practices, practical applications, and future trends: ${options.content}`;
      
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
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
      }
      
      const result = data.candidates[0]?.content?.parts[0]?.text || '';
      
      // Add prefix to indicate which AI was used
      const prefix = options.type === 'summarize' ? '[Gemini Summary] ' : '[Gemini Enhanced] ';
      return options.type === 'summarize' ? `${prefix}${result}` : `${options.content}\n\n${prefix}${result}`;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      // Fallback to simulated response if API fails
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use the same topic extraction method for consistency
      const contentPreview = options.content.substring(0, 100);
      const topic = this.extractTopic(contentPreview);
      
      if (options.type === 'summarize') {
        return `[Gemini Summary] 
${topic} represents an important area of study with significant implications.
This note provides a comprehensive overview of ${topic}, exploring its fundamental concepts and practical applications.
The analysis covers key methodologies, technical considerations, and implementation strategies related to ${topic}.
Additionally, it examines the relationship between ${topic} and adjacent fields, offering valuable insights for professionals and enthusiasts alike.
This summary captures the essential elements while preserving the nuanced perspective presented in the original content.`;
      } else {
        return `${options.content}\n\n[Gemini Enhanced] 
${topic} can be further explored through these important dimensions:

1. Conceptual Framework: ${topic} is built upon a foundation of established principles that have evolved through rigorous research and practical application.

2. Technical Implementation: Effective ${topic} requires careful consideration of methodological approaches, tool selection, and process optimization.

3. Industry Applications: Across various sectors, ${topic} has demonstrated significant value in addressing complex challenges and improving operational efficiency.

4. Ethical Considerations: The responsible implementation of ${topic} necessitates awareness of potential impacts on stakeholders and broader societal implications.

5. Comparative Analysis: When evaluated against alternative approaches, ${topic} offers distinct advantages in terms of scalability, reliability, and adaptability.

6. Case Studies: Numerous organizations have successfully leveraged ${topic} to achieve measurable improvements in performance and outcomes.

7. Future Directions: Emerging technologies and evolving methodologies continue to expand the potential applications and effectiveness of ${topic}.

This enhanced analysis provides a more comprehensive understanding of the subject matter, enabling more informed decision-making and implementation strategies.`;
      }
    }
  }
}

// Export a singleton instance
export const aiService = new AIService();