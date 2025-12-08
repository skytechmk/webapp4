<?hh // strict

/**
 * Utilities for async operations and concurrency management
 */

final class AsyncUtils {
  /**
   * Execute multiple async operations concurrently and collect results
   */
  public static async function executeConcurrently<T>(
    Traversable<Awaitable<T>> $operations,
  ): Awaitable<Vector<T>> {
    $results = Vector {};
    $awaitables = Vector::fromItems($operations);

    foreach ($awaitables as $awaitable) {
      $results[] = await $awaitable;
    }

    return $results;
  }

  /**
   * Execute operations with timeout
   */
  public static async function withTimeout<T>(
    Awaitable<T> $operation,
    int $timeoutMs,
    string $timeoutMessage = 'Operation timed out',
  ): Awaitable<T> {
    $timeout = async {
      await SleepWaitHandle::create($timeoutMs * 1000);
      throw new ServiceException('async', 'timeout', $timeoutMessage, 408);
    };

    return await GenArrayWaitHandle::create([
      $operation,
      $timeout,
    ])->getWaitHandle()->join();
  }

  /**
   * Retry async operation with exponential backoff
   */
  public static async function retryWithBackoff<T>(
    (function(): Awaitable<T>) $operation,
    int $maxRetries = 3,
    int $initialDelayMs = 100,
  ): Awaitable<T> {
    $lastException = null;

    for ($attempt = 0; $attempt <= $maxRetries; $attempt++) {
      try {
        return await $operation();
      } catch (Exception $e) {
        $lastException = $e;

        if ($attempt < $maxRetries) {
          $delay = $initialDelayMs * (1 << $attempt); // Exponential backoff
          await SleepWaitHandle::create($delay * 1000);
        }
      }
    }

    throw $lastException;
  }

  /**
   * Process items in batches with concurrency control
   */
  public static async function processBatch<T, R>(
    Traversable<T> $items,
    (function(T): Awaitable<R>) $processor,
    int $batchSize = 10,
  ): Awaitable<Vector<R>> {
    $results = Vector {};
    $batch = Vector {};

    foreach ($items as $item) {
      $batch[] = $processor($item);

      if ($batch->count() >= $batchSize) {
        $batchResults = await self::executeConcurrently($batch);
        $results->addAll($batchResults);
        $batch = Vector {};
      }
    }

    // Process remaining items
    if (!$batch->isEmpty()) {
      $batchResults = await self::executeConcurrently($batch);
      $results->addAll($batchResults);
    }

    return $results;
  }

  /**
   * Circuit breaker pattern for fault tolerance
   */
  final class CircuitBreaker {
    private int $failureCount = 0;
    private ?int $lastFailureTime = null;
    private bool $isOpen = false;

    public function __construct(
      private int $failureThreshold = 5,
      private int $recoveryTimeoutMs = 60000,
    ) {}

    public async function execute<T>(
      Awaitable<T> $operation,
    ): Awaitable<T> {
      if ($this->isOpen) {
        if ($this->shouldAttemptReset()) {
          $this->isOpen = false;
        } else {
          throw new ServiceException('circuit-breaker', 'execute', 'Circuit breaker is open', 503);
        }
      }

      try {
        $result = await $operation;
        $this->onSuccess();
        return $result;
      } catch (Exception $e) {
        $this->onFailure();
        throw $e;
      }
    }

    private function onSuccess(): void {
      $this->failureCount = 0;
      $this->isOpen = false;
    }

    private function onFailure(): void {
      $this->failureCount++;
      $this->lastFailureTime = time() * 1000;

      if ($this->failureCount >= $this->failureThreshold) {
        $this->isOpen = true;
      }
    }

    private function shouldAttemptReset(): bool {
      return $this->lastFailureTime !== null &&
             (time() * 1000 - $this->lastFailureTime) > $this->recoveryTimeoutMs;
    }
  }
}