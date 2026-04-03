import { AIProvider } from '@/types';

interface ChatOptions {
  provider: AIProvider;
  apiKey?: string;
  systemPrompt: string;
  userMessage: string;
}

interface ChatResponse {
  content?: string;
  error?: string;
}

export async function sendChatMessage(options: ChatOptions): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'API 호출에 실패했습니다.' };
    }

    return { content: data.content };
  } catch (error) {
    console.error('Chat API Error:', error);
    return { error: '네트워크 오류가 발생했습니다.' };
  }
}

import { getApiKeys, getSettings } from './storage';

export function getActiveApiKey(): { provider: AIProvider; apiKey: string } | null {
  const keys = getApiKeys();
  const settings = getSettings();
  
  if (settings.defaultProvider === 'claude' && keys.claude) {
    return { provider: 'claude', apiKey: keys.claude };
  }
  if (settings.defaultProvider === 'gemini' && keys.gemini) {
    return { provider: 'gemini', apiKey: keys.gemini };
  }
  
  if (keys.claude) {
    return { provider: 'claude', apiKey: keys.claude };
  }
  if (keys.gemini) {
    return { provider: 'gemini', apiKey: keys.gemini };
  }
  
  return null;
}

export interface PlatformKeys {
  claude: boolean;
  gemini: boolean;
}

export async function checkPlatformKeys(): Promise<PlatformKeys> {
  try {
    const response = await fetch('/api/keys');
    if (!response.ok) return { claude: false, gemini: false };
    return await response.json();
  } catch {
    return { claude: false, gemini: false };
  }
}
