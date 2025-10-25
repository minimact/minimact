/**
 * Vitest Setup File
 * Global test setup and DOM API mocks for Minimact extensions
 */

import { beforeEach, afterEach, vi } from 'vitest';

// Mock IntersectionObserver (used by minimact-punch, minimact-spatial)
global.IntersectionObserver = class IntersectionObserver {
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit
  ) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = '';
  thresholds = [];
};

// Mock MutationObserver (used by minimact-punch, minimact-quantum)
global.MutationObserver = class MutationObserver {
  constructor(public callback: MutationCallback) {}

  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
};

// Mock ResizeObserver (used by minimact-punch, minimact-spatial)
global.ResizeObserver = class ResizeObserver {
  constructor(public callback: ResizeObserverCallback) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock requestAnimationFrame (used across multiple extensions)
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  callback(Date.now());
  return 0;
});

global.cancelAnimationFrame = vi.fn();

// Mock performance.now() for timing tests
if (!global.performance) {
  global.performance = {
    now: vi.fn(() => Date.now())
  } as any;
}

// Mock matchMedia (used by minimact-punch for theme detection)
global.matchMedia = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
})) as any;

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Clean up DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

// Optional: Add custom matchers or global test utilities here
beforeEach(() => {
  // Reset DOM state before each test
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});
