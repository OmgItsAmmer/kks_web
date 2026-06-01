import { vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

let appInstance: Express | null = null;

export async function getTestApp(): Promise<Express> {
  if (!appInstance) {
    const { createApp } = await import('../../src/app');
    appInstance = createApp();
  }
  return appInstance;
}

export async function getTestAgent() {
  const app = await getTestApp();
  return request(app);
}

export function resetTestApp(): void {
  appInstance = null;
}

export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  http: vi.fn(),
};
