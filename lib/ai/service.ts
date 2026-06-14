import { AICompletionRequest, AICompletionResponse, AIProvider, AITool } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { OpenRouterProvider } from "./providers/openrouter";
import { createBusinessAgent, convertToLangChainMessages } from "./agent";

export class AIService {
  private provider: AIProvider;
  private tools: Map<string, AITool> = new Map();

  constructor(apiKey: string, providerType: "openai" | "anthropic" | "google" | "openrouter" = "openai") {
    switch (providerType) {
      case "openrouter":
        this.provider = new OpenRouterProvider(apiKey);
        break;
      case "openai":
      default:
        this.provider = new OpenAIProvider(apiKey);
        break;
    }
  }

  registerTool(tool: AITool) {
    this.tools.set(tool.name, tool);
  }

  async generateResponse(request: AICompletionRequest): Promise<AICompletionResponse> {
    try {
      // Use LangChain agent for enhanced capabilities
      const agent = await createBusinessAgent();
      const langChainMessages = convertToLangChainMessages(request.messages);
      
      const result = await agent.invoke({
        messages: langChainMessages,
      });

      const lastMessage = result.messages[result.messages.length - 1];
      return {
        content: lastMessage.content as string,
      };
    } catch (error) {
      console.error("LangChain agent error:", error);
      // Fallback to original provider if agent fails
      return this.provider.chatCompletion(request);
    }
  }

  async streamResponse(request: AICompletionRequest): Promise<ReadableStream<Uint8Array>> {
    let activeProvider = this.provider;
    if (request.config?.provider && request.config.provider !== "openai") {
      if (request.config.provider === "openrouter") {
        activeProvider = new OpenRouterProvider(request.config.apiKey || "");
      }
    }

    return activeProvider.streamChatCompletion({
      ...request,
      tools: Array.from(this.tools.values()),
    });
  }
}

// Singleton instance management
let instance: AIService | null = null;

export function getAIService(apiKey?: string, provider?: "openai" | "anthropic" | "google" | "openrouter"): AIService {
  const key = apiKey || process.env.OPENAI_API_KEY || "mock-key";
  // We create a new instance if params are provided to support dynamic switching,
  // or return the singleton if no params.
  if (apiKey || provider) {
    return new AIService(key, provider);
  }

  if (!instance) {
    instance = new AIService(key);
  }
  return instance;
}
