import { RespondFn, SlashCommand } from '@slack/bolt';
import { processQuery } from '../services/chatbot';
import { formatSlackResponse } from '../utils/formatter';

export async function handleSlashCommand(
  command: SlashCommand,
  respond: RespondFn
): Promise<void> {
  const text = command.text?.trim();

  if (!text) {
    await respond({
      response_type: 'ephemeral',
      text: '질문을 입력해주세요.\n\n사용법: `/aegis [질문]`\n예: `/aegis AEGIS 프로젝트 개요 알려줘`',
    });
    return;
  }

  try {
    // Send initial response
    await respond({
      response_type: 'ephemeral',
      text: '🔍 질문을 분석하고 있습니다...',
    });

    // Process the query
    const response = await processQuery(text);

    // Format and send the response
    const formattedResponse = formatSlackResponse(response);

    await respond({
      response_type: 'in_channel', // Make the response visible to everyone
      replace_original: false,
      ...formattedResponse,
    });
  } catch (error) {
    console.error('Error handling slash command:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ 죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
}
