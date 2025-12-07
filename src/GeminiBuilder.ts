import {
  GoogleGenerativeAI,
  ModelParams,
  Part,
  UsageMetadata,
} from '@google/generative-ai';
import fs from 'fs';

export class GeminiBuilder {
  private parts: Part[] = [];
  private modelName: string = 'gemini-2.5-flash-lite';
  private cacheName: string | undefined;
  private genAI: GoogleGenerativeAI;
  private systemPrompt: string;
  private contents: { role: string; message: string }[] = [];
  public usageMetadata?: UsageMetadata;

  constructor(apiKey: string, systemPrompt: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.contents = [];
    this.systemPrompt = systemPrompt;
  }

  text(prompt: string): this {
    this.parts.push({ text: prompt });
    return this;
  }

  image(pathOrBuffer: string | Buffer, mimeType: string = 'image/jpeg'): this {
    const data =
      typeof pathOrBuffer === 'string'
        ? fs.readFileSync(pathOrBuffer).toString('base64')
        : pathOrBuffer.toString('base64');

    this.parts.push({
      inlineData: {
        data,
        mimeType,
      },
    });
    return this;
  }

  audio(pathOrBuffer: string | Buffer, mimeType: string = 'audio/mp3'): this {
    const data =
      typeof pathOrBuffer === 'string'
        ? fs.readFileSync(pathOrBuffer).toString('base64')
        : pathOrBuffer.toString('base64');

    this.parts.push({
      inlineData: {
        data,
        mimeType,
      },
    });
    return this;
  }

  withContext(cacheName: string): this {
    this.cacheName = cacheName;
    return this;
  }

  withContents(contents: { role: string; message: string }[]): this {
    this.contents = contents;
    return this;
  }

  async generate(): Promise<string> {
    let finalSystemInstruction = this.systemPrompt;
    const historyParts: { role: string; parts: Part[] }[] = [];

    if (this.contents && this.contents.length > 0) {
      for (const content of this.contents) {
        if (content.role === 'system') {
          finalSystemInstruction += `\n${content.message}`;
        } else {
          historyParts.push({
            role: content.role,
            parts: [{ text: content.message }],
          });
        }
      }
    }

    const modelParams: ModelParams = {
      model: this.modelName,
      systemInstruction: finalSystemInstruction,
    };

    if (this.cacheName) {
      // Placeholder for cache logic
      //     console.log(`Using cached content: ${this.cacheName}`);
      //     modelParams.cachedContent = { name: this.cacheName } as any; // Basic reference
      // }
    }

    const model = this.genAI.getGenerativeModel(modelParams);

    // Combine history with current parts
    const request = {
      contents: [...historyParts, { role: 'user', parts: this.parts }],
    };

    const result = await model.generateContent(request);
    this.usageMetadata = result.response.usageMetadata;
    return result.response.text();
  }
}
