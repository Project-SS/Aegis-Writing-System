import { SayFn } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { processQuery } from '../services/chatbot';
import { formatSlackResponse } from '../utils/formatter';

interface SlackMessage {
  text?: string;
  user?: string;
  channel?: string;
  ts?: string;
  thread_ts?: string;
  channel_type?: string;
  subtype?: string;
}

export async function handleMessage(
  message: SlackMessage,
  say: SayFn,
  client: WebClient
): Promise<void> {
  // Ignore bot messages and message edits
  if (message.subtype === 'bot_message' || message.subtype === 'message_changed') {
    return;
  }

  const text = message.text?.trim();
  if (!text) {
    return;
  }

  const userId = message.user;
  const threadTs = message.thread_ts || message.ts;

  try {
    // Show typing indicator
    await client.chat.postMessage({
      channel: message.channel!,
      thread_ts: threadTs,
      text: '🔍 질문을 분석하고 있습니다...',
    });

    // Process the query
    const response = await processQuery(text);

    // Format and send the response
    const formattedResponse = formatSlackResponse(response);

    await say({
      thread_ts: threadTs,
      ...formattedResponse,
    });
  } catch (error) {
    console.error('Error handling message:', error);
    await say({
      thread_ts: threadTs,
      text: '❌ 죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
}
