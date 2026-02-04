import { useState, useCallback, useRef } from 'react';
import { withRetry, retryOpenAI, retryShopify, type RetryResult } from '../utils/retry';
import { type ValidationResult } from '../utils/validation';

export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiOperationState<T> {
  status: OperationStatus;
  data: T | null;
  error: string | null;
  isLoading: boolean;
  progress: number;
  attempts: number;
  duration: number;
}

export interface ApiOperationOptions {
  maxRetries?: number;
  validateInput?: (input: any) => ValidationResult;
  onProgress?: (progress: number) => void;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  retryType?: 'default' | 'openai' | 'shopify';
}

/**
 * Hook for managing API operations with retry logic, validation, and loading states
 */
export function useApiOperation<TInput, TResult>(
  operation: (input: TInput) => Promise<TResult>,
  options: ApiOperationOptions = {}
) {
  const [state, setState] = useState<ApiOperationState<TResult>>({
    status: 'idle',
    data: null,
    error: null,
    isLoading: false,
    progress: 0,
    attempts: 0,
    duration: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (input: TInput): Promise<TResult | null> => {
    // Validate input if validator provided
    if (options.validateInput) {
      const validation = options.validateInput(input);
      if (!validation.isValid) {
        const errorMessage = validation.error || 'Invalid input';
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: errorMessage, 
          isLoading: false 
        }));
        options.onError?.(errorMessage);
        return null;
      }
    }

    // Create abort controller for this operation
    abortControllerRef.current = new AbortController();

    // Set loading state
    setState(prev => ({
      ...prev,
      status: 'loading',
      error: null,
      isLoading: true,
      progress: 0,
      attempts: 0,
      duration: 0
    }));

    options.onProgress?.(10); // Initial progress

    try {
      const startTime = Date.now();

      // Choose retry strategy based on operation type
      const retryFunction = 
        options.retryType === 'openai' ? retryOpenAI :
        options.retryType === 'shopify' ? retryShopify :
        withRetry;

      const result = await retryFunction(
        () => operation(input),
        {
          maxAttempts: options.maxRetries || 3,
          onRetry: (attempt, error) => {
            setState(prev => ({ ...prev, attempts: attempt }));
            
            // Update progress based on attempts
            const progressIncrement = 20 * attempt;
            options.onProgress?.(Math.min(90, 10 + progressIncrement));
          }
        }
      );

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          status: 'success',
          data: result.data!,
          isLoading: false,
          progress: 100,
          attempts: result.attempts,
          duration
        }));

        options.onProgress?.(100);
        options.onSuccess?.(result.data);
        
        return result.data;
      } else {
        const errorMessage = result.error?.message || 'Operation failed';
        setState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage,
          isLoading: false,
          attempts: result.attempts,
          duration
        }));

        options.onError?.(errorMessage);
        return null;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
        isLoading: false,
        duration: Date.now() - Date.now()
      }));

      options.onError?.(errorMessage);
      return null;
    } finally {
      abortControllerRef.current = null;
    }
  }, [operation, options]);

  const reset = useCallback(() => {
    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({
      status: 'idle',
      data: null,
      error: null,
      isLoading: false,
      progress: 0,
      attempts: 0,
      duration: 0
    });
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      status: 'idle',
      isLoading: false,
      error: 'Operation cancelled'
    }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    cancel
  };
}

/**
 * Hook for managing multiple related API operations (batch processing)
 */
export function useBatchApiOperation<TInput, TResult>(
  operation: (input: TInput) => Promise<TResult>,
  options: ApiOperationOptions = {}
) {
  const [operations, setOperations] = useState<Map<string, ApiOperationState<TResult>>>(new Map());
  const [batchStatus, setBatchStatus] = useState<{
    total: number;
    completed: number;
    failed: number;
    isRunning: boolean;
  }>({
    total: 0,
    completed: 0,
    failed: 0,
    isRunning: false
  });

  const addOperation = useCallback((id: string, input: TInput) => {
    setOperations(prev => new Map(prev.set(id, {
      status: 'idle',
      data: null,
      error: null,
      isLoading: false,
      progress: 0,
      attempts: 0,
      duration: 0
    })));
  }, []);

  const executeAll = useCallback(async (inputs: Array<{ id: string; input: TInput }>) => {
    setBatchStatus({
      total: inputs.length,
      completed: 0,
      failed: 0,
      isRunning: true
    });

    const promises = inputs.map(async ({ id, input }) => {
      try {
        // Update operation status to loading
        setOperations(prev => new Map(prev.set(id, {
          ...prev.get(id)!,
          status: 'loading',
          isLoading: true
        })));

        const result = await operation(input);

        // Update operation status to success
        setOperations(prev => new Map(prev.set(id, {
          ...prev.get(id)!,
          status: 'success',
          data: result,
          isLoading: false
        })));

        setBatchStatus(prev => ({
          ...prev,
          completed: prev.completed + 1
        }));

        return { id, success: true, result };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Update operation status to error
        setOperations(prev => new Map(prev.set(id, {
          ...prev.get(id)!,
          status: 'error',
          error: errorMessage,
          isLoading: false
        })));

        setBatchStatus(prev => ({
          ...prev,
          failed: prev.failed + 1
        }));

        return { id, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(promises);

    setBatchStatus(prev => ({ ...prev, isRunning: false }));

    return results;
  }, [operation]);

  const resetAll = useCallback(() => {
    setOperations(new Map());
    setBatchStatus({
      total: 0,
      completed: 0,
      failed: 0,
      isRunning: false
    });
  }, []);

  const getOperationState = useCallback((id: string) => {
    return operations.get(id) || null;
  }, [operations]);

  const getOverallProgress = useCallback(() => {
    if (batchStatus.total === 0) return 0;
    return ((batchStatus.completed + batchStatus.failed) / batchStatus.total) * 100;
  }, [batchStatus]);

  return {
    operations: Array.from(operations.entries()).map(([id, state]) => ({ id, ...state })),
    batchStatus,
    addOperation,
    executeAll,
    resetAll,
    getOperationState,
    getOverallProgress
  };
}

/**
 * Hook specifically for content extraction operations
 */
export function useContentExtraction() {
  const extractionOperation = useApiOperation(
    async (input: { text: string; productId: string }) => {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.text })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },
    {
      retryType: 'openai',
      maxRetries: 3,
      validateInput: (input) => {
        if (!input.text || input.text.trim().length < 20) {
          return {
            isValid: false,
            error: 'Text content must be at least 20 characters long',
            suggestions: ['Provide more detailed product specifications']
          };
        }
        if (!input.productId) {
          return {
            isValid: false,
            error: 'Product must be selected',
            suggestions: ['Select a product from your Shopify store first']
          };
        }
        return { isValid: true };
      }
    }
  );

  return extractionOperation;
}

/**
 * Hook for saving extracted content to Shopify
 */
export function useSaveContent() {
  const saveOperation = useApiOperation(
    async (input: { productId: string; content: any }) => {
      const response = await fetch(`/api/products/${input.productId}/save-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.content })
      });

      if (!response.ok) {
        throw new Error(`Failed to save content: ${response.statusText}`);
      }

      return response.json();
    },
    {
      retryType: 'shopify',
      maxRetries: 2,
      validateInput: (input) => {
        if (!input.productId) {
          return { isValid: false, error: 'Product ID is required' };
        }
        if (!input.content) {
          return { isValid: false, error: 'Content is required' };
        }
        return { isValid: true };
      }
    }
  );

  return saveOperation;
}