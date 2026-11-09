import { generateText } from 'ai';

if (!process.env.AI_GATEWAY_API_KEY) {
  throw new Error('Set AI_GATEWAY_API_KEY in .env.local before running this example.');
}

const { text } = await generateText({
  model: 'meta/llama-4-scout',
  prompt: 'Invent a new holiday and describe its traditions.',
});

console.log(text);
