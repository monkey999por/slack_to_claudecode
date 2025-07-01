import { WebClient } from '@slack/web-api';
import { app } from './app';
import { SessionManager } from '../claude/session';
import { formatOutput } from '../utils/formatter';

const sessionManager = SessionManager.getInstance();

export async function openPromptModal(client: WebClient, triggerId: string, userId: string) {
  await client.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'prompt_modal',
      title: {
        type: 'plain_text',
        text: 'Send Prompt to Claude',
      },
      submit: {
        type: 'plain_text',
        text: 'Send',
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Enter your prompt for Claude Code:',
          },
        },
        {
          type: 'input',
          block_id: 'prompt_input',
          label: {
            type: 'plain_text',
            text: 'Prompt',
          },
          element: {
            type: 'plain_text_input',
            action_id: 'prompt_text',
            multiline: true,
            placeholder: {
              type: 'plain_text',
              text: 'Enter your prompt here...',
            },
          },
        },
      ],
      private_metadata: userId,
    },
  });
}

app.view('prompt_modal', async ({ ack, view, client }) => {
  await ack();

  const userId = view.private_metadata;
  const prompt = view.state.values.prompt_input.prompt_text.value;

  if (!prompt) {
    return;
  }

  console.log(`Modal: Getting session for user ${userId}`);
  const session = sessionManager.getSession(userId);
  if (!session) {
    console.log(`Modal: No session found for user ${userId}`);
    await client.chat.postMessage({
      channel: userId,
      text: '❌ Session expired. Please start a new session.',
    });
    return;
  }
  console.log(`Modal: Found session ${session.id} for user ${userId}`);

  try {
    await client.chat.postMessage({
      channel: session.channelId,
      text: `💭 Processing prompt: "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
    });

    const output = await session.sendPrompt(prompt);
    const formattedOutput = await formatOutput(output);

    if (formattedOutput.type === 'message') {
      await client.chat.postMessage({
        channel: session.channelId,
        text: formattedOutput.content,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: formattedOutput.content,
            },
          },
        ],
      });
    } else if (formattedOutput.type === 'file') {
      await client.files.upload({
        channels: session.channelId,
        content: formattedOutput.content,
        filename: formattedOutput.filename || 'claude_output.txt',
        title: 'Claude Code Output',
        initial_comment: '📄 Output was too large for a message. Here\'s the full response:',
      });
    }
  } catch (error) {
    console.error('Error processing prompt:', error);
    await client.chat.postMessage({
      channel: session.channelId,
      text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
    });
  }
});