import {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
} from "../types";

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.openai.com/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async chatCompletion(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const config = request.config;
    const model = config?.model || "gpt-4o-mini";
    const temperature = config?.temperature ?? 0.7;
    const apiKey = config?.apiKey || this.apiKey;
    const baseUrl = config?.customEndpoint || this.baseUrl;

    const tools = request.tools?.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const body: any = {
      model,
      messages: request.messages.map((msg) => {
        if (msg.role === "function") {
          return {
            role: "tool",
            tool_call_id: msg.name, // Using name as tool_call_id for simplicity mapping
            content: msg.content,
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      }),
      temperature,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `OpenAI API Error: ${error.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;

      let functionCall = undefined;
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        functionCall = {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        };
      }

      return {
        content: message.content,
        functionCall,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  }

  async streamChatCompletion(
    request: AICompletionRequest,
  ): Promise<ReadableStream<Uint8Array>> {
    const config = request.config;
    const model = config?.model || "gpt-4o-mini";
    const temperature = config?.temperature ?? 0.7;
    const apiKey = config?.apiKey || this.apiKey;
    const baseUrl = config?.customEndpoint || this.baseUrl;

    const tools = request.tools?.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const body: any = {
      model,
      messages: request.messages.map((msg) => {
        if (msg.role === "function") {
          return {
            role: "tool",
            tool_call_id: msg.name,
            content: msg.content,
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      }),
      temperature,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `OpenAI API Error: ${error.error?.message || response.statusText}`,
        );
      }

      if (!response.body) {
        throw new Error("No response body received from OpenAI");
      }

      return response.body;
    } catch (error) {
      console.error("AI Service Streaming Error:", error);
      throw error;
    }
  }
}
