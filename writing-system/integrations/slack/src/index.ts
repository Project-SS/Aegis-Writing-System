import { App, LogLevel } from '@slack/bolt';
import * as dotenv from 'dotenv';
import { handleMessage } from './handlers/message';
import { handleAppMention } from './handlers/mention';
import { handleSlashCommand } from './handlers/commands';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file or environment configuration.');
  process.exit(1);
}

// Check for AI provider configuration
const aiProvider = process.env.AI_PROVIDER || 'gemini';
if (aiProvider === 'claude' && !process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is required when AI_PROVIDER is set to "claude"');
  process.exit(1);
}
if (aiProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required when AI_PROVIDER is set to "gemini"');
  process.exit(1);
}

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // Socket Mode (recommended for development)
  socketMode: !!process.env.SLACK_APP_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  // HTTP Mode port (for production without Socket Mode)
  port: parseInt(process.env.PORT || '3001', 10),
  logLevel: LogLevel.INFO,
});

// Register event handlers

// Handle direct messages to the bot
app.message(async ({ message, say, client }) => {
  // Only respond to direct messages (not in channels)
  const msg = message as any;
  if (msg.channel_type === 'im') {
    await handleMessage(msg, say, client);
  }
});

// Handle @mentions in channels
app.event('app_mention', async ({ event, say, client }) => {
  await handleAppMention(event as any, say, client);
});

// Slash commands
app.command('/aegis', async ({ command, ack, respond }) => {
  await ack();
  await handleSlashCommand(command, respond);
});

app.command('/aegis-help', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*🤖 AEGIS Bot 사용 가이드*',
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
  });
});

// Error handler
app.error(async (error) => {
  console.error('❌ Slack app error:', error);
});

// Start the app
(async () => {
  await app.start();
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║   🤖 AEGIS Slack Bot is running!                          ║');
  console.log('║                                                            ║');
  console.log(`║   AI Provider: ${aiProvider.padEnd(42)}║`);
  console.log(`║   Mode: ${process.env.SLACK_APP_TOKEN ? 'Socket Mode' : 'HTTP Mode'.padEnd(48)}║`);
  if (!process.env.SLACK_APP_TOKEN) {
    console.log(`║   Port: ${(process.env.PORT || '3001').padEnd(48)}║`);
  }
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
})();
