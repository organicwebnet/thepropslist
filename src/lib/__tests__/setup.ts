// Test setup file for Google Drive integration tests

// Mock global fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock File constructor for Node.js environment
if (!global.File) {
  global.File = class File {
    name: string;
    size: number;
    type: string;
    lastModified: number;

    constructor(
      chunks: (string | Blob)[],
      filename: string,
      options: { type?: string } = {}
    ) {
      this.name = filename;
      this.type = options.type || 'text/plain';
      this.lastModified = Date.now();
      
      // Calculate size from chunks
      this.size = chunks.reduce((total, chunk) => {
        if (typeof chunk === 'string') {
          return total + chunk.length;
        }
        return total + (chunk.size || 0);
      }, 0);
    }
  } as any;
}

// Mock Blob constructor
if (!global.Blob) {
  global.Blob = class Blob {
    size: number;
    type: string;

    constructor(chunks: any[] = [], options: { type?: string } = {}) {
      this.type = options.type || '';
      this.size = chunks.reduce((total, chunk) => {
        if (typeof chunk === 'string') {
          return total + chunk.length;
        }
        return total + (chunk.size || 0);
      }, 0);
    }
  } as any;
}

// Mock FormData
if (!global.FormData) {
  global.FormData = class FormData {
    private data: Map<string, any> = new Map();

    append(key: string, value: any) {
      this.data.set(key, value);
    }

    get(key: string) {
      return this.data.get(key);
    }

    has(key: string) {
      return this.data.has(key);
    }

    delete(key: string) {
      this.data.delete(key);
    }

    forEach(callback: (value: any, key: string) => void) {
      this.data.forEach(callback);
    }
  } as any;
}

// Mock URL.createObjectURL
if (!global.URL) {
  global.URL = {
    createObjectURL: jest.fn(() => 'mock-object-url'),
    revokeObjectURL: jest.fn(),
  } as any;
}

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});









