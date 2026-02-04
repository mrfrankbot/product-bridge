// Retry utilities for resilient API calls

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, 5xx errors, and rate limits
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true; // Network error
    }
    if (error?.status >= 500) {
      return true; // Server error
    }
    if (error?.status === 429) {
      return true; // Rate limit
    }
    if (error?.message?.includes('timeout')) {
      return true; // Timeout
    }
    return false;
  },
  onRetry: () => {} // No-op by default
};

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt or if condition says no
      if (attempt === config.maxAttempts || !config.retryCondition(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );

      config.onRetry(attempt, error);
      
      // Wait before retrying
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: config.maxAttempts,
    totalTime: Date.now() - startTime
  };
}

/**
 * Retry a fetch request with specific error handling
 */
export async function retryFetch(
  url: string, 
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<RetryResult<Response>> {
  const operation = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  };

  return withRetry(operation, {
    maxAttempts: 3,
    baseDelayMs: 1000,
    ...options,
    onRetry: (attempt, error) => {
      console.log(`Retrying fetch to ${url} (attempt ${attempt}):`, error.message);
      options.onRetry?.(attempt, error);
    }
  });
}

/**
 * Retry an OpenAI API call with specific handling
 */
export async function retryOpenAI<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    ...options,
    retryCondition: (error) => {
      // Retry on network errors and 5xx
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return true;
      }
      
      // OpenAI specific error handling
      if (error?.status >= 500) {
        return true; // Server error
      }
      if (error?.status === 429) {
        return true; // Rate limit
      }
      if (error?.message?.includes('timeout')) {
        return true;
      }
      
      // Don't retry on authentication or quota errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      
      return false;
    },
    onRetry: (attempt, error) => {
      console.log(`Retrying OpenAI call (attempt ${attempt}):`, error.message);
      options.onRetry?.(attempt, error);
    }
  });
}

/**
 * Retry Shopify API calls with specific handling
 */
export async function retryShopify<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelayMs: 1000,
    ...options,
    retryCondition: (error) => {
      // Network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return true;
      }
      
      // Shopify specific errors
      if (error?.status >= 500) {
        return true; // Server error
      }
      if (error?.status === 429) {
        return true; // Rate limit (Shopify uses this for API limits)
      }
      if (error?.status === 503) {
        return true; // Service unavailable
      }
      
      // Don't retry on auth errors or bad requests
      if (error?.status === 401 || error?.status === 403 || error?.status === 400) {
        return false;
      }
      
      return false;
    },
    onRetry: (attempt, error) => {
      console.log(`Retrying Shopify API call (attempt ${attempt}):`, error.message);
      options.onRetry?.(attempt, error);
    }
  });
}

/**
 * Circuit breaker pattern for repeated failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeoutMs = 60000, // 1 minute
    private resetTimeoutMs = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error as Error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Timeout wrapper for operations
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(
    private maxConcurrent = 5,
    private delayMs = 100
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.running++;
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          setTimeout(() => this.processQueue(), this.delayMs);
        }
      });

      this.processQueue();
    });
  }

  private processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}