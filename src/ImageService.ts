import { GeminiBuilder } from './GeminiBuilder.js';
import { v2 as cloudinary } from 'cloudinary';
import { Buffer } from 'buffer';

export interface ImageGenerationResult {
  refinedPrompt: string;
  image: {
    mimeType: string;
    data: string;
    url: string;
  };
}

export class ImageService {
  private geminiApiKey: string;
  private stabilityApiKey: string;

  constructor(geminiApiKey: string, stabilityApiKey: string) {
    this.geminiApiKey = geminiApiKey;
    this.stabilityApiKey = stabilityApiKey;
  }

  async generateImage(prompt: string): Promise<ImageGenerationResult> {
    console.log(`[ImageService] Processing prompt: "${prompt}"`);

    // 1. Refine Prompt
    const refinerSystemPrompt = `You are an expert prompt generator for gemini nano banana that will take this prompt and generate a specific, high-quality prompt for image generation. If the prompt is too vauge you will do your best token prediction to enhance it. RETURN ONLY FIRST AND BEST PROMPT`;
    const refiner = new GeminiBuilder(this.geminiApiKey, refinerSystemPrompt);
    const refinedPrompt = await refiner.text(prompt).generate();

    console.log(`[ImageService] Refined Prompt: "${refinedPrompt}"`);

    // 2. Generate Image with Stability AI
    console.log(`[ImageService] Generating image with Stability AI Core...`);

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
            Authorization: `Bearer ${this.stabilityApiKey}`,
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
          `[ImageService] Stability AI Error (${response.status}):`,
          errorText,
        );
        throw new Error(
          `Stability AI generation failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');

      // 3. Upload to Cloudinary
      console.log('[ImageService] Uploading to Cloudinary...');
      const uploadResult = await cloudinary.uploader.upload(
        `data:image/png;base64,${base64Image}`,
        {
          upload_preset: 'ml_default',
        },
      );
      console.log(
        `[ImageService] Uploaded to Cloudinary: ${uploadResult.secure_url}`,
      );

      console.log(`[ImageService] Image Generation Complete.`);

      return {
        refinedPrompt,
        image: {
          mimeType: 'image/png',
          data: base64Image,
          url: uploadResult.secure_url,
        },
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[ImageService] Stability AI Request Timed Out');
        throw new Error('Image generation timed out after 60 seconds');
      }
      throw error;
    }
  }
}

