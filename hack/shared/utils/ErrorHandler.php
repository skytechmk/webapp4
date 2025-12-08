<?hh // strict

/**
 * Centralized error handling utilities for Hack services
 */

final class ServiceException extends Exception {
  public function __construct(
    private string $serviceName,
    private string $operation,
    private string $details,
    private int $httpStatusCode = 500,
  ) {
    parent::__construct("{$serviceName} service error in {$operation}: {$details}");
  }

  public function getServiceName(): string { return $this->serviceName; }
  public function getOperation(): string { return $this->operation; }
  public function getDetails(): string { return $this->details; }
  public function getHttpStatusCode(): int { return $this->httpStatusCode; }
}

final class ValidationException extends ServiceException {
  public function __construct(string $serviceName, string $field, string $reason) {
    parent::__construct(
      $serviceName,
      'validation',
      "Field '{$field}' validation failed: {$reason}",
      400
    );
  }
}

final class NotFoundException extends ServiceException {
  public function __construct(string $serviceName, string $resourceType, string $id) {
    parent::__construct(
      $serviceName,
      'find',
      "{$resourceType} with id '{$id}' not found",
      404
    );
  }
}

final class UnauthorizedException extends ServiceException {
  public function __construct(string $serviceName, string $operation) {
    parent::__construct(
      $serviceName,
      $operation,
      'Unauthorized access',
      401
    );
  }
}

final class ErrorHandler {
  public static function handleException(Exception $e): ApiResponse<mixed> {
    if ($e instanceof ServiceException) {
      return ApiResponse::error($e->getMessage(), $e->getHttpStatusCode());
    }

    // Log unexpected errors
    error_log('Unexpected error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

    return ApiResponse::error('Internal server error', 500);
  }

  public static function validateRequired<T>(
    string $serviceName,
    string $field,
    ?T $value,
  ): T {
    if ($value === null) {
      throw new ValidationException($serviceName, $field, 'is required');
    }
    return $value;
  }

  public static function validateStringLength(
    string $serviceName,
    string $field,
    string $value,
    int $minLength = 0,
    ?int $maxLength = null,
  ): string {
    if (strlen($value) < $minLength) {
      throw new ValidationException(
        $serviceName,
        $field,
        "must be at least {$minLength} characters long"
      );
    }

    if ($maxLength !== null && strlen($value) > $maxLength) {
      throw new ValidationException(
        $serviceName,
        $field,
        "must be at most {$maxLength} characters long"
      );
    }

    return $value;
  }

  public static function validateEmail(string $serviceName, string $email): string {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
      throw new ValidationException($serviceName, 'email', 'invalid email format');
    }
    return $email;
  }
}