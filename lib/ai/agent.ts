import { ChatOpenAI } from "@langchain/openai";
import { DynamicTool } from "@langchain/core/tools";
import { createDeepAgent } from "deepagents";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { getAIConfig } from "./config";
import { businessTools } from "./tools";
import { AIChatMessage } from "./types";

export async function createBusinessAgent() {
  const config = await getAIConfig();

  // Initialize the LLM based on provider
  let llm;
  if (config.provider === "openrouter") {
    llm = new ChatOpenAI({
      model: config.model,
      temperature: config.temperature,
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      maxTokens: config.maxTokens,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://nats.app",
          "X-Title": "NATS ERP",
        },
      },
    });
  } else {
    // Default to OpenAI
    llm = new ChatOpenAI({
      model: config.model,
      temperature: config.temperature,
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      maxTokens: config.maxTokens,
    });
  }

  // Convert our custom tools to LangChain DynamicTools
  const tools = businessTools.map(
    (tool) =>
      new DynamicTool({
        name: tool.name,
        description: tool.description,
        func: async (args: string) => {
          try {
            const parsedArgs = JSON.parse(args);
            const result = await tool.handler(parsedArgs);
            return typeof result === "string" ? result : JSON.stringify(result);
          } catch (e) {
            return `Error: ${(e as Error).message}`;
          }
        },
      }),
  );

  // Create the agent
  const agent = createDeepAgent({
    model: llm,
    tools,
    systemPrompt:
      "You are a helpful business assistant. Use the provided tools to answer questions about the company's financial data, inventory, sales, employees, and other business operations. Always provide clear, actionable insights.",
  });

  return agent;
}

// Convert our message type to LangChain messages
export function convertToLangChainMessages(
  messages: AIChatMessage[],
): BaseMessage[] {
  return messages.map((msg) => {
    if (msg.role === "user") {
      return new HumanMessage(msg.content);
    } else if (msg.role === "assistant") {
      return new AIMessage(msg.content);
    } else {
      return new AIMessage(msg.content);
    }
  });
}
