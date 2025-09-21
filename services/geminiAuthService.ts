import { GoogleGenAI, Type } from '@google/genai'
import { SimpleAuthService } from '../lib/simpleAuth'
import type { ChatMessage } from '../types'

let ai: GoogleGenAI

interface AuthFunctionCall {
  name: 'createUser' | 'signIn' | 'signOut' | 'checkCredits'
  args: Record<string, any>
}

// Function definitions that Gemini can use for auth operations
const authFunctions = [
  {
    name: "createUser",
    description: "Create a new user account with email and optional full name.",
    parameters: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "User's email address"
        },
        fullName: {
          type: "string",
          description: "User's full name (optional)"
        }
      },
      required: ["email"]
    }
  },
  {
    name: "signIn",
    description: "Sign in existing user with email",
    parameters: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "User's email address"
        }
      },
      required: ["email"]
    }
  },
  {
    name: "signOut",
    description: "Sign out current user",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "checkCredits",
    description: "Check current user's remaining credits",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  }
]

export class GeminiAuthService {
  private model: any

  constructor() {
    // Initialize AI client if not already done
    if (!ai) {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not found in environment variables');
      }
      ai = new GoogleGenAI({ apiKey });
    }
    
    this.model = ai.models
  }

  async processAuthRequest(
    message: string, 
    conversation: ChatMessage[],
    onAuthAction?: (action: AuthFunctionCall) => Promise<any>
  ): Promise<{ response: string, functionCalls?: AuthFunctionCall[] }> {
    try {
      const prompt = this.buildAuthPrompt(message, conversation)
      
      const result = await this.model.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      })

      // Safely extract text from response
      let response: string;
      try {
        response = result.candidates[0]?.content?.parts[0]?.text ?? '';
      } catch (error) {
        console.error('Error extracting text from Gemini response:', error);
        throw new Error('Failed to parse Gemini API response');
      }
      
      // Simple pattern matching for function calls since we can't use function calling API
      const functionCalls = this.extractFunctionCallsFromText(response)
      
      if (functionCalls.length > 0 && onAuthAction) {
        // Execute function calls
        const results = await Promise.all(
          functionCalls.map(call => onAuthAction(call))
        )
        
        // Generate follow-up response based on results
        const followUpPrompt = this.buildFollowUpPrompt(functionCalls, results)
        const followUpResult = await this.model.generateContent({
          model: "gemini-2.5-flash",
          contents: followUpPrompt
        })

        // Safely extract text from follow-up response
        let followUpResponse: string;
        try {
          followUpResponse = followUpResult.candidates[0]?.content?.parts[0]?.text ?? "I'm sorry, I encountered an error processing your request. Please try again.";
        } catch (error) {
          console.error('Error extracting text from follow-up Gemini response:', error);
          followUpResponse = "I'm sorry, I encountered an error processing your request. Please try again.";
        }

        return {
          response: followUpResponse,
          functionCalls
        }
      }
      
      return {
        response: response,
        functionCalls
      }
    } catch (error) {
      console.error('Error in auth request processing:', error)
      return {
        response: "I'm sorry, I encountered an error processing your authentication request. Please try again."
      }
    }
  }

  private buildAuthPrompt(message: string, conversation: ChatMessage[]): string {
    const conversationHistory = conversation
      .map(msg => `${msg.author}: ${msg.text}`)
      .join('\n')

    return `
You are an AI assistant helping users with authentication for a prescription finder app. You can perform the following actions:

1. createUser(email, fullName?) - Create new user account
2. signIn(email) - Sign in existing user  
3. signOut() - Sign out current user
4. checkCredits() - Check user's remaining search credits

Context: This is a prescription finder app where users need to authenticate to search for prescribers. Free users get 3 search credits.

Conversation history:
${conversationHistory}

Current message: ${message}

Instructions:
- If user wants to sign up/create account, use createUser
- If user wants to sign in, use signIn  
- If user mentions logging out, use signOut
- If user asks about credits/searches remaining, use checkCredits
- Be conversational and helpful
- Always confirm the user's email before calling auth functions

Respond naturally and call appropriate functions when needed.
`
  }

  private buildFollowUpPrompt(functionCalls: AuthFunctionCall[], results: any[]): string {
    const callResults = functionCalls.map((call, index) => {
      return `${call.name}(${JSON.stringify(call.args)}) -> ${JSON.stringify(results[index])}`
    }).join('\n')

    return `
Based on these function call results, provide a helpful response to the user:

${callResults}

Guidelines:
- If sign in was successful, welcome the user
- If there was an error, explain what went wrong in user-friendly terms
- If credits were checked, let them know how many they have remaining
- If sign out was successful, confirm they've been signed out
- Be conversational and supportive
`
  }

  private extractFunctionCallsFromText(text: string): AuthFunctionCall[] {
    try {
      const functionCalls: AuthFunctionCall[] = []
      
      // Safety check for text parameter
      if (!text || typeof text !== 'string') {
        console.warn('extractFunctionCallsFromText: invalid text parameter', text)
        return functionCalls
      }
      
      // Look for email patterns to trigger auth functions
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      const emails = text.match(emailRegex)
      
      if (emails && emails.length > 0) {
        const email = emails[0]
        
        // If text mentions "sign up", "create account", or "new user"
        if (text.toLowerCase().includes('sign up') || 
            text.toLowerCase().includes('create account') || 
            text.toLowerCase().includes('new user')) {
          functionCalls.push({
            name: 'createUser',
            args: { email }
          })
        } else if (text.toLowerCase().includes('sign in') || 
                   text.toLowerCase().includes('login')) {
          functionCalls.push({
            name: 'signIn',
            args: { email }
          })
        }
      }
      
      // Check for sign out requests
      if (text.toLowerCase().includes('sign out') || 
          text.toLowerCase().includes('log out') ||
          text.toLowerCase().includes('logout')) {
        functionCalls.push({
          name: 'signOut',
          args: {}
        })
      }
      
      // Check for credit inquiries
      if (text.toLowerCase().includes('credit') || 
          text.toLowerCase().includes('remaining') ||
          text.toLowerCase().includes('how many searches')) {
        functionCalls.push({
          name: 'checkCredits',
          args: {}
        })
      }
      
      return functionCalls
    } catch (error) {
      console.error('Error extracting function calls:', error)
      return []
    }
  }

  // Execute auth function calls
  async executeAuthFunction(call: AuthFunctionCall): Promise<any> {
    switch (call.name) {
      case 'createUser':
        return await SimpleAuthService.createUser(call.args.email, call.args.fullName)
      
      case 'signIn':
        return await SimpleAuthService.signIn(call.args.email)
      
      case 'signOut':
        return await SimpleAuthService.signOut()
      
      case 'checkCredits':
        const user = await SimpleAuthService.getCurrentUser()
        return { credits: user?.credits || 0 }
      
      default:
        throw new Error(`Unknown function: ${call.name}`)
    }
  }
}
