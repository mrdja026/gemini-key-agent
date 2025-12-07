console.log('[DEBUG] Script started');

import express from 'express';
console.log('[DEBUG] express imported');

import cors from 'cors';
import bodyParser from 'body-parser';
import { GeminiBuilder } from './GeminiBuilder.js';
console.log('[DEBUG] GeminiBuilder imported');

import { v2 as cloudinary } from 'cloudinary';
console.log('[DEBUG] cloudinary imported');

import { ImageService } from './ImageService.js';
console.log('[DEBUG] ImageService imported');

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

console.log('[DEBUG] Imports complete');

// Robust Env Loading
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../.env');
const cwdEnv = path.resolve(process.cwd(), '.env');

console.log(
  `[Sidecar] Loading env. __dirname: ${__dirname}, CWD: ${process.cwd()}`,
);

if (fs.existsSync(rootEnv)) {
  console.log(`[Sidecar] Loading .env from ${rootEnv}`);
  dotenv.config({ path: rootEnv });
} else if (fs.existsSync(cwdEnv)) {
  console.log(`[Sidecar] Loading .env from ${cwdEnv}`);
  dotenv.config({ path: cwdEnv });
} else {
  console.warn(`[Sidecar] WARNING: .env not found in ${rootEnv} or ${cwdEnv}`);
}

// Global Error Handlers
process.on('uncaughtException', (err) => {
  console.error('[Sidecar] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(
    '[Sidecar] Unhandled Rejection at:',
    promise,
    'reason:',
    reason,
  );
});

const app = express();
const PORT = process.env.SIDECAR_PORT || 4001;
const API_KEY = process.env.GEMINI_API_KEY;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('[Sidecar] CRITICAL: Cloudinary credentials not found in env.');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

if (!API_KEY) {
  console.error('[Sidecar] CRITICAL: GEMINI_API_KEY not found in env.');
}

if (!STABILITY_API_KEY) {
  console.error('[Sidecar] CRITICAL: STABILITY_API_KEY not found in env.');
}

console.log('[DEBUG] Initializing ImageService');
const imageService = new ImageService(API_KEY || '', STABILITY_API_KEY || '');
console.log('[DEBUG] ImageService initialized');

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

    console.log(
      `[Sidecar] Received request. Prompt: "${prompt.substring(0, 50)}..."`,
    );

    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY is missing');
    }

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
      details: error.message,
    });
  }
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log(
      `[Sidecar] Received image generation request. Prompt: "${prompt}"`,
    );

    const result = await imageService.generateImage(prompt);

    res.json(result);
  } catch (error: any) {
    console.error('[Sidecar] Image Generation Error:', error);
    res.status(500).json({
      error: 'Image generation failed',
      details: error.message,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gemini-sidecar' });
});

console.log('[DEBUG] Starting server listen...');
app.listen(PORT, () => {
  console.log(`Gemini Sidecar running on http://localhost:${PORT}`);
});

// Keep process alive
setInterval(() => {}, 1000 * 60 * 60);
