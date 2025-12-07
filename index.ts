import 'dotenv/config'; // ✅ must be first, auto-runs dotenv.config()
import { GeminiBuilder } from './src/GeminiBuilder.js';

console.log('ENV CHECK:', process.env.GEMINI_API_KEY); // TEMP debug

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('No API KEY found in .env');
  process.exit(1);
}

async function main() {
  console.log('Starting Gemini Story Generation...');
  const systemPrompt =
    'You are a lunatic storywriter, it has to have shock value, it is nonsense, it uses sublte humor, and it does not make sense';
  const builder = new GeminiBuilder(API_KEY!, systemPrompt);
  const contents = [
    {
      role: 'user',
      message:
        'This contents is about a evil flower that has thors and it looks like a mushroom',
    },
    {
      role: 'system',
      message: 'story must be around 300 charcters as a joke',
    },
  ];
  try {
    console.log('Generating story...');
    const result = await builder
      .text('Write me a story about a flower that was evil')
      .withContents(contents)
      .generate();

    console.log('\n--- GENERATED STORY ---');
    console.log(result);
    console.log('-----------------------\n');

    // Check for --verbose-token flag or VERBOSE_TOKEN env var
    const verboseToken =
      process.argv.includes('--verbose-token') ||
      process.env.VERBOSE_TOKEN === 'true';
    if (verboseToken && builder.usageMetadata) {
      console.log('--- TOKEN USAGE ---');
      console.log(`Prompt Tokens: ${builder.usageMetadata.promptTokenCount}`);
      console.log(
        `Response Tokens: ${builder.usageMetadata.candidatesTokenCount}`,
      );
      console.log(`Total Tokens: ${builder.usageMetadata.totalTokenCount}`);
      console.log('-------------------\n');
    }
  } catch (error) {
    console.error('DEBUG: Error caught in main:', error);
  }
}

main();
