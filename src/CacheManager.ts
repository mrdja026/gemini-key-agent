import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { GoogleAICacheManager } from '@google/generative-ai/server';

export class CacheManager {
  private fileManager: GoogleAIFileManager;
  private cacheManager: GoogleAICacheManager;
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.fileManager = new GoogleAIFileManager(apiKey);
    this.cacheManager = new GoogleAICacheManager(apiKey);
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async uploadFile(path: string, mimeType: string) {
    const uploadResult = await this.fileManager.uploadFile(path, {
      mimeType,
      displayName: path,
    });
    console.log(
      `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`,
    );
    return uploadResult.file;
  }

  async create(
    cacheName: string,
    contents: any[],
    model: string,
    ttlSeconds: number = 300,
  ) {
    console.log(`Creating cache: ${cacheName} with TTL ${ttlSeconds}s`);

    // Note: "contents" usually needs to be formatted with role/parts
    // The SDK expects { model, contents, ttlSeconds }

    try {
      const cache = await this.cacheManager.create({
        model,
        displayName: cacheName,
        contents: contents, // Expects Content[]
        ttlSeconds,
      });
      console.log(`Cache created: ${cache.name}`);
      return cache;
    } catch (e) {
      console.error(
        'Failed to create cache:',
        JSON.stringify(e, Object.getOwnPropertyNames(e), 2),
      );
      throw e;
    }
  }

  async delete(cacheName: string) {
    console.log(`Deleting cache: ${cacheName}`);
    try {
      await this.cacheManager.delete(cacheName);
      console.log(`Deleted cache: ${cacheName}`);
    } catch (e) {
      console.warn(`Could not delete cache ${cacheName} (might not exist):`, e);
    }
  }
}
