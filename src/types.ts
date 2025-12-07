import { Content, Part } from '@google/generative-ai';

export interface IGeminiBuilder {
  text(prompt: string): this;
  image(pathOrBuffer: string | Buffer, mimeType?: string): this;
  audio(pathOrBuffer: string | Buffer, mimeType?: string): this;
  withContext(cacheName: string): this;
  generate(): Promise<string>;
}

export interface ICacheManager {
  create(key: string, content: Content[], ttlMinutes: number): Promise<void>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  cleanup(): Promise<void>;
}
