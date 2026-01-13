import { ChatResponse, SourceItem } from '../services/chatbot';

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: any[];
  accessory?: any;
}

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

// Convert markdown to Slack mrkdwn format
function convertMarkdownToSlack(text: string): string {
  // Convert headers
  text = text.replace(/^### (.+)$/gm, '*$1*');
  text = text.replace(/^## (.+)$/gm, '*$1*');
  text = text.replace(/^# (.+)$/gm, '*$1*');

  // Convert bold (already compatible)
  // **text** -> *text*
  text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');

  // Convert italic
  // _text_ is already compatible

  // Convert code blocks
  text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '```$2```');

  // Convert inline code (already compatible)

  // Convert links
  // [text](url) -> <url|text>
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');

  // Convert bullet lists (already compatible with -)

  // Convert numbered lists
  text = text.replace(/^\d+\. /gm, '• ');

  // Convert horizontal rules
  text = text.replace(/^---+$/gm, '───────────────────');

  return text;
}

// Format sources for Slack
function formatSources(sources: SourceItem[]): SlackBlock[] {
  if (sources.length === 0) {
    return [];
  }

  const blocks: SlackBlock[] = [
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📚 *참조 문서* (${sources.length}개)`,
        },
      ],
    },
  ];

  // Group sources by type
  const confluenceSources = sources.filter(s => s.type === 'confluence');
  const jiraSources = sources.filter(s => s.type === 'jira');

  // Add Confluence sources
  if (confluenceSources.length > 0) {
    const confluenceLinks = confluenceSources
      .slice(0, 5) // Limit to 5
      .map(s => `• <${s.url}|${s.title}>`)
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📄 Confluence*\n${confluenceLinks}`,
      },
    });
  }

  // Add Jira sources
  if (jiraSources.length > 0) {
    const jiraLinks = jiraSources
      .slice(0, 5) // Limit to 5
      .map(s => `• <${s.url}|${s.title}>`)
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🎫 Jira*\n${jiraLinks}`,
      },
    });
  }

  return blocks;
}

// Split long text into chunks for Slack (max 3000 chars per block)
function splitTextIntoChunks(text: string, maxLength: number = 2900): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  const paragraphs = text.split('\n\n');

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // If a single paragraph is too long, split it
      if (paragraph.length > maxLength) {
        const lines = paragraph.split('\n');
        currentChunk = '';
        for (const line of lines) {
          if (currentChunk.length + line.length + 1 > maxLength) {
            chunks.push(currentChunk.trim());
            currentChunk = line;
          } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Main formatter function
export function formatSlackResponse(response: ChatResponse): SlackMessage {
  const slackText = convertMarkdownToSlack(response.content);
  const chunks = splitTextIntoChunks(slackText);

  const blocks: SlackBlock[] = [];

  // Add content blocks
  for (const chunk of chunks) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: chunk,
      },
    });
  }

  // Add sources
  const sourceBlocks = formatSources(response.sources);
  blocks.push(...sourceBlocks);

  // Add footer
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `🤖 _AEGIS Bot • ${process.env.AI_PROVIDER === 'claude' ? 'Claude' : 'Gemini'} AI_`,
      },
    ],
  });

  return {
    text: response.content.substring(0, 200) + '...', // Fallback text
    blocks,
    unfurl_links: false,
    unfurl_media: false,
  };
}

// Format error message
export function formatErrorMessage(error: string): SlackMessage {
  return {
    text: `❌ ${error}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *오류가 발생했습니다*\n${error}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '문제가 지속되면 관리자에게 문의해주세요.',
          },
        ],
      },
    ],
  };
}

// Format help message
export function formatHelpMessage(): SlackMessage {
  return {
    text: 'AEGIS Bot 사용 가이드',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🤖 AEGIS Bot 사용 가이드',
          emoji: true,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*💬 대화 방법*\n• DM으로 직접 메시지 보내기\n• 채널에서 `@AEGIS Bot` 멘션하기\n• `/aegis [질문]` 슬래시 명령어 사용',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*📚 질문 예시*\n• "AEGIS 프로젝트 개요 알려줘"\n• "진행 중인 버그 이슈 목록"\n• "최근 업데이트된 문서 찾아줘"\n• "AEGIS-123 이슈 상태 알려줘"',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*🔗 연동 서비스*\n• Confluence 문서 검색\n• Jira 이슈 조회',
        },
      },
    ],
  };
}
