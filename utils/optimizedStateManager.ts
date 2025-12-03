import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { performanceOptimizer } from './performanceOptimizer';

// Enhanced useState with proper cleanup and synchronization
export function useOptimizedState<T>(initialValue: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
    const [state, setState] = useState<T>(initialValue);
    const stateRef = useRef<T>(typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const optimizedSetState = useCallback((value: T | ((prev: T) => T)) => {
        setState(prev => {
            const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
            stateRef.current = newValue;
            return newValue;
        });
    }, []);

    return [state, optimizedSetState];
}

// Synchronized state with cleanup
export function useSynchronizedState<T>(initialValue: T | (() => T), cleanupFn?: (value: T) => void): [T, (value: T | ((prev: T) => T)) => void] {
    const [state, setState] = useOptimizedState<T>(initialValue);
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        return () => {
            if (cleanupFn && cleanupRef.current) {
                try {
                    cleanupFn(state);
                } catch (error) {
                    console.error('State cleanup error:', error);
                }
            }
        };
    }, [state, cleanupFn]);

    return [state, setState];
}

// Optimized useEffect with proper cleanup tracking
export function useOptimizedEffect(effect: () => (() => void) | void, deps: any[] = []): void {
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Clean up previous effect
        if (cleanupRef.current) {
            try {
                cleanupRef.current();
            } catch (error) {
                console.error('Effect cleanup error:', error);
            }
        }

        // Run new effect
        const cleanup = effect();
        if (typeof cleanup === 'function') {
            cleanupRef.current = cleanup;
        }

        return () => {
            if (cleanupRef.current) {
                try {
                    cleanupRef.current();
                } catch (error) {
                    console.error('Effect cleanup error:', error);
                }
                cleanupRef.current = null;
            }
        };
    }, deps);
}

// Memory-efficient data structures
export function useOptimizedMap<K, V>(initialEntries?: Iterable<readonly [K, V]>): [Map<K, V>, (updater: (map: Map<K, V>) => void) => void] {
    const [map] = useState(() => new Map<K, V>(initialEntries));
    const mapRef = useRef(map);

    const updateMap = useCallback((updater: (map: Map<K, V>) => void) => {
        updater(mapRef.current);
        // Force re-render by creating a new map reference
        mapRef.current = new Map<K, V>(mapRef.current);
    }, []);

    return [mapRef.current, updateMap];
}

export function useOptimizedSet<T>(initialValues?: Iterable<T>): [Set<T>, (updater: (set: Set<T>) => void) => void] {
    const [set] = useState(() => new Set<T>(initialValues));
    const setRef = useRef(set);

    const updateSet = useCallback((updater: (set: Set<T>) => void) => {
        updater(setRef.current);
        // Force re-render by creating a new set reference
        setRef.current = new Set<T>(setRef.current);
    }, []);

    return [setRef.current, updateSet];
}

// Error handling utilities
export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorListeners: Set<(error: Error) => void> = new Set();
    private errorHistory: Array<{ error: Error; timestamp: number; context: string }> = [];

    private constructor() { }

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    public addErrorListener(listener: (error: Error) => void): void {
        this.errorListeners.add(listener);
    }

    public removeErrorListener(listener: (error: Error) => void): void {
        this.errorListeners.delete(listener);
    }

    public handleError(error: unknown, context: string = 'unknown'): void {
        const errorObj = error instanceof Error ? error : new Error(String(error));

        // Log to error history
        this.errorHistory.push({
            error: errorObj,
            timestamp: Date.now(),
            context
        });

        // Keep only last 50 errors
        if (this.errorHistory.length > 50) {
            this.errorHistory.shift();
        }

        // Notify listeners
        this.errorListeners.forEach(listener => {
            try {
                listener(errorObj);
            } catch (listenerError) {
                console.error('Error listener failed:', listenerError);
            }
        });

        // Log to console
        console.error(`[${context}] Error:`, errorObj);

        // Report to error monitoring service if available
        if (typeof window !== 'undefined' && (window as any).Sentry) {
            (window as any).Sentry.captureException(errorObj, { tags: { context } });
        }
    }

    public getErrorHistory(): Array<{ error: Error; timestamp: number; context: string }> {
        return [...this.errorHistory];
    }

    public clearErrorHistory(): void {
        this.errorHistory = [];
    }
}

// React hook for error handling
export function useErrorHandler() {
    const errorHandlerRef = useRef(ErrorHandler.getInstance());

    const handleError = useCallback((error: unknown, context: string = 'unknown') => {
        errorHandlerRef.current.handleError(error, context);
    }, []);

    const addErrorListener = useCallback((listener: (error: Error) => void) => {
        errorHandlerRef.current.addErrorListener(listener);
        return () => errorHandlerRef.current.removeErrorListener(listener);
    }, []);

    return {
        handleError,
        addErrorListener,
        getErrorHistory: () => errorHandlerRef.current.getErrorHistory(),
        clearErrorHistory: () => errorHandlerRef.current.clearErrorHistory()
    };
}

// Performance-optimized event emitter
export class OptimizedEventEmitter<T extends string> {
    private listeners: Map<T, Set<Function>> = new Map();
    private onceListeners: Map<T, Set<Function>> = new Map();

    public on(event: T, listener: Function): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(listener);

        return () => this.off(event, listener);
    }

    public once(event: T, listener: Function): void {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set());
        }
        this.onceListeners.get(event)?.add(listener);
    }

    public off(event: T, listener: Function): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)?.delete(listener);
        }
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event)?.delete(listener);
        }
    }

    public emit(event: T, ...args: any[]): void {
        // Handle regular listeners
        if (this.listeners.has(event)) {
            this.listeners.get(event)?.forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in event listener for ${String(event)}:`, error);
                }
            });
        }

        // Handle once listeners
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event)?.forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in once listener for ${String(event)}:`, error);
                }
            });
            this.onceListeners.delete(event);
        }
    }

    public clearListeners(event?: T): void {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
        }
    }

    public listenerCount(event: T): number {
        return (this.listeners.get(event)?.size || 0) + (this.onceListeners.get(event)?.size || 0);
    }
}

// State synchronization utilities
export function useSynchronizedStateWithValidation<T>(
    initialValue: T | (() => T),
    validator?: (value: T) => boolean,
    cleanupFn?: (value: T) => void
): [T, (value: T | ((prev: T) => T)) => boolean] {
    const [state, setState] = useSynchronizedState<T>(initialValue, cleanupFn);

    const validatedSetState = useCallback((value: T | ((prev: T) => T)) => {
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(state) : value;

        if (validator && !validator(newValue)) {
            console.warn('State validation failed, rejecting update');
            return false;
        }

        setState(newValue);
        return true;
    }, [state, validator]);

    return [state, validatedSetState];
}

// Memory-efficient object pooling
export class ObjectPool<T> {
    private pool: T[] = [];
    private createFn: () => T;
    private resetFn?: (obj: T) => void;
    private maxSize: number;

    constructor(createFn: () => T, resetFn?: (obj: T) => void, maxSize: number = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
    }

    public acquire(): T {
        if (this.pool.length > 0) {
            const obj = this.pool.pop()!;
            if (this.resetFn) {
                this.resetFn(obj);
            }
            return obj;
        }
        return this.createFn();
    }

    public release(obj: T): void {
        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
    }

    public clear(): void {
        this.pool = [];
    }

    public get size(): number {
        return this.pool.length;
    }
}

// Export singleton instances
export const errorHandler = ErrorHandler.getInstance();
export const eventEmitter = new OptimizedEventEmitter<string>();