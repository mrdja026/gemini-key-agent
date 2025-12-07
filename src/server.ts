import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GeminiBuilder } from './GeminiBuilder.js';
import 'dotenv/config';

const app = express();
const PORT = process.env.SIDECAR_PORT || 4001;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('CRITICAL: GEMINI_API_KEY not found in env.');
  process.exit(1);
}

app.use(cors());
app.use(bodyParser.json());

interface GenerateRequest {
  prompt: string;
  history?: { role: string; message: string }[];
  systemPrompt?: string;
  model?: string;
}

app.post('/api/generate', async (req, res) => {
  try {
    const {
      prompt,
      history = [],
      systemPrompt = 'You are a helpful assistant.',
    } = req.body as GenerateRequest;

    console.log(`[Sidecar] Received request. Prompt: "${prompt.substring(0, 50)}..."`);

    const builder = new GeminiBuilder(API_KEY, systemPrompt);
    
    // Add history if present
    if (history.length > 0) {
      builder.withContents(history);
    }

    const text = await builder.text(prompt).generate();
    const usage = builder.usageMetadata;

    console.log('[Sidecar] Generation successful.');
    
    res.json({
      text,
      usage,
    });
  } catch (error: any) {
    console.error('[Sidecar] Error:', error);
    res.status(500).json({ 
      error: 'Generation failed', 
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gemini-sidecar' });
});

app.listen(PORT, () => {
  console.log(`Gemini Sidecar running on http://localhost:${PORT}`);
});
