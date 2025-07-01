import { app } from './app';
import { openPromptModal } from './modals';
import { SessionManager } from '../claude/session';

const sessionManager = SessionManager.getInstance();

app.command('/claude', async ({ command, ack, respond, client }) => {
  console.log('Received /claude command:', { text: command.text, user_id: command.user_id, channel_id: command.channel_id });

  const { text, user_id, channel_id } = command;
  const [subcommand] = text.split(' ');

  try {
    switch (subcommand) {
      case 'start': {
        await ack();
        const session = await sessionManager.createSession(user_id, channel_id);
        await respond({
          text: `✅ New Claude Code session started!\nSession ID: ${session.id}\nUse \`/claude prompt\` to send commands.`,
          response_type: 'ephemeral',
        });
        break;
      }

      case 'prompt': {
        const session = sessionManager.getSession(user_id);
        if (!session) {
          await ack();
          await respond({
            text: '❌ No active session found. Please start a session first with `/claude start`',
            response_type: 'ephemeral',
          });
          return;
        }
        
        await ack();
        
        await openPromptModal(client, command.trigger_id, user_id);
        break;
      }

      case 'status': {
        await ack();
        const session = sessionManager.getSession(user_id);
        if (!session) {
          await respond({
            text: '❌ No active session found.',
            response_type: 'ephemeral',
          });
          return;
        }
        
        await respond({
          text: `📊 Session Status:\n• ID: ${session.id}\n• Status: ${session.status}\n• Created: ${new Date(session.createdAt).toLocaleString()}`,
          response_type: 'ephemeral',
        });
        break;
      }

      case 'restart': {
        await ack();
        const session = sessionManager.getSession(user_id);
        if (!session) {
          await respond({
            text: '❌ No active session found.',
            response_type: 'ephemeral',
          });
          return;
        }
        
        await sessionManager.restartSession(user_id);
        await respond({
          text: '🔄 Claude Code has been restarted.',
          response_type: 'ephemeral',
        });
        break;
      }

      case 'end': {
        await ack();
        const session = sessionManager.getSession(user_id);
        if (!session) {
          await respond({
            text: '❌ No active session found.',
            response_type: 'ephemeral',
          });
          return;
        }
        
        await sessionManager.endSession(user_id);
        await respond({
          text: '👋 Session ended successfully.',
          response_type: 'ephemeral',
        });
        break;
      }

      default: {
        await ack();
        await respond({
          text: '❓ Unknown command. Available commands:\n' +
                '• `/claude start` - Start a new session\n' +
                '• `/claude prompt` - Send a prompt\n' +
                '• `/claude status` - Check session status\n' +
                '• `/claude restart` - Restart Claude Code\n' +
                '• `/claude end` - End current session',
          response_type: 'ephemeral',
        });
      }
    }
  } catch (error) {
    console.error('Command error:', error);
    await ack();
    try {
      await respond({
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        response_type: 'ephemeral',
      });
    } catch (respondError) {
      console.error('Failed to send error response:', respondError);
    }
  }
});