import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GeminiBuilder } from './GeminiBuilder.js';
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

const app = express();
const PORT = process.env.SIDECAR_PORT || 4001;
const API_KEY = process.env.GEMINI_API_KEY;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('CRITICAL: Cloudinary credentials not found in env.');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

if (!API_KEY) {
  console.error('CRITICAL: GEMINI_API_KEY not found in env.');
  process.exit(1);
}

if (!STABILITY_API_KEY) {
  console.error('CRITICAL: STABILITY_API_KEY not found in env.');
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

    console.log(
      `[Sidecar] Received request. Prompt: "${prompt.substring(0, 50)}..."`,
    );

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

    // 1. Refine Prompt
    const refinerSystemPrompt = `You are an expert prompt generator for gemini nano banana that will take this prompt and generate a specific, high-quality prompt for image generation. If the prompt is too vauge you will do your best token prediction to enhance it. RETURN ONLY FIRST AND BEST PROMPT`;
    const refiner = new GeminiBuilder(API_KEY, refinerSystemPrompt);
    const refinedPrompt = await refiner.text(prompt).generate();

    console.log(`[Sidecar] Refined Prompt: "${refinedPrompt}"`);

    // 2. Generate Image
    // Using Stability AI "Stable Image Core"
    console.log(`[Sidecar] Generating image with Stability AI Core...`);

    const formData = new FormData();
    formData.append('prompt', refinedPrompt);
    formData.append('output_format', 'png');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(
        'https://api.stability.ai/v2beta/stable-image/generate/core',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${STABILITY_API_KEY}`,
            Accept: 'image/*',
          },
          body: formData,
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Sidecar] Stability AI Error (${response.status}):`,
          errorText,
        );
        throw new Error(
          `Stability AI generation failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');

      // Upload to Cloudinary
      console.log('[Sidecar] Uploading to Cloudinary...');
      const uploadResult = await cloudinary.uploader.upload(
        `data:image/png;base64,${base64Image}`,
        {
          upload_preset: 'ml_default',
        },
      );
      console.log(
        `[Sidecar] Uploaded to Cloudinary: ${uploadResult.secure_url}`,
      );

      console.log(`[Sidecar] Image Generation Complete.`);

      res.json({
        refinedPrompt,
        image: {
          mimeType: 'image/png',
          data: base64Image,
          url: uploadResult.secure_url,
        },
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[Sidecar] Stability AI Request Timed Out');
        throw new Error('Image generation timed out after 60 seconds');
      }
      throw error;
    }
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

app.listen(PORT, () => {
  console.log(`Gemini Sidecar running on http://localhost:${PORT}`);
});
