import 'dotenv/config';
import { app } from './slack/app';
import './slack/commands';
import './slack/modals';

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await app.start(PORT);
    console.log(`⚡️ Claude Code Slack Bot is running on port ${PORT}`);
    console.log('✅ Socket Mode enabled - no public URL required');
    console.log('📝 Available commands:');
    console.log('  /claude start - Start a new session');
    console.log('  /claude prompt - Send a prompt');
    console.log('  /claude status - Check session status');
    console.log('  /claude restart - Restart Claude Code');
    console.log('  /claude end - End current session');
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();