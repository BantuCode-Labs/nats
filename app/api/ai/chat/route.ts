import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { getAIService } from "@/lib/ai/service";
import { getAIConfig } from "@/lib/ai/config";
import { businessTools } from "@/lib/ai/tools";
import { prisma } from "@/lib/prisma";
import { AIChatMessage } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request body: messages array required" },
        { status: 400 }
      );
    }

    // Rate Limiting: 50 requests per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentUsage = await prisma.aIUsage.count({
      where: {
        userId: session.userId,
        createdAt: { gt: oneHourAgo },
      },
    });

    if (recentUsage > 50) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const aiConfig = await getAIConfig(session.userId);
    const aiService = getAIService();

    // Register tools
    businessTools.forEach(tool => aiService.registerTool(tool));

    // Get or create session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const newSession = await prisma.aISession.create({
        data: {
          userId: session.userId,
          title: messages[0].content.slice(0, 50) + "...",
        },
      });
      currentSessionId = newSession.id;
    }

    // Save user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      await prisma.aIMessage.create({
        data: {
          sessionId: currentSessionId,
          role: "user",
          content: lastMessage.content,
        },
      });
    }

    // Generate response using LangChain agent
    const response = await aiService.generateResponse({
      messages: messages as AIChatMessage[],
      config: aiConfig,
      tools: businessTools,
    });

    const content = response.content || "";

    // Save assistant message
    await prisma.aIMessage.create({
      data: {
        sessionId: currentSessionId,
        role: "assistant",
        content,
      },
    });

    // Track usage
    await prisma.aIUsage.create({
      data: {
        userId: session.userId,
        model: aiConfig.model,
        tokensPrompt: 0,
        tokensCompletion: Math.ceil(content.length / 4),
        tokensTotal: Math.ceil(content.length / 4),
      },
    });

    // Create a simple readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(content));
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Session-Id": currentSessionId,
      },
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
