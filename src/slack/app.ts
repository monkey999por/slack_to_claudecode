import { App } from '@slack/bolt';

if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_APP_TOKEN) {
  throw new Error('Missing required Slack environment variables');
}

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: parseInt(process.env.PORT || '3000'),
});

app.error(async (error) => {
  console.error('Slack app error:', error);
});

app.event('app_mention', async ({ event, say }) => {
  try {
    await say({
      text: `Hello <@${event.user}>! I'm Claude Code Bot. Use slash commands to interact with me:\n` +
            '• `/claude start` - Start a new session\n' +
            '• `/claude prompt` - Send a prompt\n' +
            '• `/claude status` - Check session status\n' +
            '• `/claude restart` - Restart Claude Code\n' +
            '• `/claude end` - End current session',
      thread_ts: event.ts,
    });
  } catch (error) {
    console.error('Error handling app_mention:', error);
  }
});