import { SayFn } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { processQuery } from '../services/chatbot';
import { formatSlackResponse } from '../utils/formatter';

interface AppMentionEvent {
  type: 'app_mention';
  text: string;
  user?: string;
  channel: string;
  ts: string;
  thread_ts?: string;
  event_ts: string;
}

export async function handleAppMention(
  event: AppMentionEvent,
  say: SayFn,
  client: WebClient
): Promise<void> {
  // Remove the bot mention from the text
  // Format: <@U12345678> question text
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  if (!text) {
    await say({
      thread_ts: event.thread_ts || event.ts,
      text: '안녕하세요! 무엇을 도와드릴까요? 💬\n\nConfluence 문서나 Jira 이슈에 대해 질문해주세요.\n예: "AEGIS 프로젝트 개요 알려줘" 또는 "진행 중인 버그 이슈 목록"',
    });
    return;
  }

  const threadTs = event.thread_ts || event.ts;

  try {
    // Add a reaction to show we're processing
    await client.reactions.add({
      channel: event.channel,
      timestamp: event.ts,
      name: 'eyes',
    });

    // Process the query
    const response = await processQuery(text);

    // Remove the processing reaction
    await client.reactions.remove({
      channel: event.channel,
      timestamp: event.ts,
      name: 'eyes',
    });

    // Add a checkmark reaction
    await client.reactions.add({
      channel: event.channel,
      timestamp: event.ts,
      name: 'white_check_mark',
    });

    // Format and send the response
    const formattedResponse = formatSlackResponse(response);

    await say({
      thread_ts: threadTs,
      ...formattedResponse,
    });
  } catch (error) {
    console.error('Error handling app mention:', error);

    // Remove processing reaction on error
    try {
      await client.reactions.remove({
        channel: event.channel,
        timestamp: event.ts,
        name: 'eyes',
      });
      await client.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'x',
      });
    } catch {
      // Ignore reaction errors
    }

    await say({
      thread_ts: threadTs,
      text: '❌ 죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
}
