import { ChatOpenAI } from "@langchain/openai";
import { DynamicTool } from "@langchain/core/tools";
import { createDeepAgent } from "deepagents";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { getAIConfig } from "./config";
import { getToolsForUser } from "./tool-registry";
import { AIChatMessage } from "./types";
import type { AIUserContext } from "./context";
import { canAccessCustomReports } from "./context";

function buildSystemPrompt(ctx: AIUserContext): string {
  const customAccess = canAccessCustomReports(ctx);
  const roleLine = `Authenticated user: ${ctx.userName} (role: ${ctx.role}).`;

  const customSection = customAccess
    ? `
## Custom Report Generation (AUTHORIZED)
You may use get_database_schema, validate_custom_sql, run_custom_sql_report, and generate_custom_report.
Workflow for custom reports:
1. Prefer run_standard_report when a native report already answers the question.
2. Otherwise call get_database_schema (optionally filter by module).
3. Draft a read-only SELECT; validate with validate_custom_sql.
4. If validation requires approval for sensitive tables, explain why and re-run with approved=true only when the request is clearly legitimate.
5. Present results as a clear markdown report with tables, then summarize trends, anomalies, and actionable recommendations.
Security rules: SELECT/WITH only, no password/token columns, LIMIT required, never invent table names outside the schema catalog.
`
    : `
## Custom Report Generation (NOT AUTHORIZED)
This user cannot run custom SQL or inspect the full database schema.
If they ask for ad-hoc SQL or unrestricted data dumps, refuse politely and offer standard reports via list_available_reports / run_standard_report instead.
`;

  return `You are NATS ERP business assistant with full access to operational data tools and standard system reports.

${roleLine}

## Core capabilities
- Answer questions about accounting, sales, purchasing, cash/bank, inventory, payroll, assets, budgeting, production, and POS.
- Always use tools for factual data; do not invent numbers.
- For reporting requests, call list_available_reports or run_standard_report with the correct report code and dates (YYYY-MM-DD).
- After returning report data, provide concise business analysis: trends, anomalies, and recommendations when useful.
- Format money and tables clearly in markdown.

## Standard reports
Use run_standard_report for: profit_loss, balance_sheet, cash_flow, equity_change, financial_ratios, ar_aging, receivable, customer_recap, sales_by_product, profitability, ap_aging, payable, vendor_recap, cash_balance, cash_flow_summary, daily_cash_movement, stock_valuation, low_stock, slow_moving, inventory_movement, budget_variance, overspending, asset_register, depreciation_summary, asset_valuation, production_output, material_consumption, wip.

${customSection}

## Response style
- Be precise, structured, and actionable.
- When a request is ambiguous, choose the closest standard report and state your assumption, or ask one clarifying question.
- Never expose secrets, passwords, API keys, or raw connection strings.`;
}

export async function createBusinessAgent(ctx: AIUserContext) {
  const config = await getAIConfig(ctx.userId);

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
    llm = new ChatOpenAI({
      model: config.model,
      temperature: config.temperature,
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      maxTokens: config.maxTokens,
    });
  }

  const tools = getToolsForUser(ctx).map(
    (tool) =>
      new DynamicTool({
        name: tool.name,
        description: tool.description,
        func: async (args: string) => {
          try {
            const parsedArgs = args?.trim() ? JSON.parse(args) : {};
            const result = await tool.handler(parsedArgs);
            return typeof result === "string" ? result : JSON.stringify(result);
          } catch (e) {
            // Some models pass plain strings instead of JSON
            try {
              const result = await tool.handler(
                typeof args === "string" ? { input: args } : args,
              );
              return typeof result === "string"
                ? result
                : JSON.stringify(result);
            } catch (inner) {
              return `Error: ${(inner as Error).message || (e as Error).message}`;
            }
          }
        },
      }),
  );

  const agent = createDeepAgent({
    model: llm,
    tools,
    systemPrompt: buildSystemPrompt(ctx),
  });

  return agent;
}

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
