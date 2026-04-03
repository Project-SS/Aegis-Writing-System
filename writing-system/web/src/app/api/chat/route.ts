import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';

interface ChatRequest {
  provider: 'claude' | 'gemini';
  apiKey?: string;
  systemPrompt: string;
  userMessage: string;
}

function resolveApiKey(provider: string, clientKey?: string): string | null {
  if (clientKey) return clientKey;

  if (provider === 'claude') {
    return process.env.CLAUDE_API_KEY || null;
  }
  if (provider === 'gemini') {
    return process.env.GEMINI_API_KEY || null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { provider, apiKey: clientApiKey, systemPrompt, userMessage } = body;

    const apiKey = resolveApiKey(provider, clientApiKey);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 필요합니다. 설정 페이지에서 입력하거나 플랫폼 환경변수를 확인하세요.' },
        { status: 400 }
      );
    }

    if (!userMessage) {
      return NextResponse.json(
        { error: '메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    let content: string;

    if (provider === 'claude') {
      content = await callClaude(apiKey, systemPrompt, userMessage);
    } else if (provider === 'gemini') {
      content = await callGemini(apiKey, systemPrompt, userMessage);
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 AI 제공자입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `AI 호출 중 오류가 발생했습니다: ${message}` },
      { status: 500 }
    );
  }
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response');
  }

  return textContent.text;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error('No text content in response');
  }

  return text;
}
