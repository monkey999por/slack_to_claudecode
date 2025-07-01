
interface FormattedOutput {
  type: 'message' | 'file';
  content: string;
  filename?: string;
}

const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_OUTPUT_LENGTH || '40000');

export async function formatOutput(
  output: string
): Promise<FormattedOutput> {
  const cleanOutput = cleanAnsiCodes(output);
  
  if (cleanOutput.length <= MAX_MESSAGE_LENGTH) {
    return {
      type: 'message',
      content: formatForSlack(cleanOutput),
    };
  }
  
  return {
    type: 'file',
    content: cleanOutput,
    filename: `claude_output_${Date.now()}.txt`,
  };
}

function cleanAnsiCodes(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function formatForSlack(text: string): string {
  if (text.includes('```')) {
    return text;
  }
  
  const lines = text.split('\n');
  const formattedLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  for (const line of lines) {
    if (line.match(/^(#|\/\/|def |function |class |import |from |const |let |var )/)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockContent = [line];
      } else {
        codeBlockContent.push(line);
      }
    } else if (inCodeBlock && line.trim() === '') {
      codeBlockContent.push(line);
    } else {
      if (inCodeBlock) {
        formattedLines.push('```');
        formattedLines.push(...codeBlockContent);
        formattedLines.push('```');
        inCodeBlock = false;
        codeBlockContent = [];
      }
      formattedLines.push(line);
    }
  }

  if (inCodeBlock) {
    formattedLines.push('```');
    formattedLines.push(...codeBlockContent);
    formattedLines.push('```');
  }

  return formattedLines.join('\n');
}