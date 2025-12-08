<?hh // strict

/**
 * Common type definitions shared across Hack services
 */

final class User {
  public function __construct(
    private string $id,
    private string $email,
    private string $username,
    private int $createdAt,
    private ?string $profileImage = null,
  ) {}

  public function getId(): string { return $this->id; }
  public function getEmail(): string { return $this->email; }
  public function getUsername(): string { return $this->username; }
  public function getCreatedAt(): int { return $this->createdAt; }
  public function getProfileImage(): ?string { return $this->profileImage; }
}

final class Event {
  public function __construct(
    private string $id,
    private string $title,
    private string $description,
    private int $startTime,
    private string $userId,
    private int $createdAt,
    private ?string $location = null,
    private Vector<string> $tags = Vector {},
  ) {}

  public function getId(): string { return $this->id; }
  public function getTitle(): string { return $this->title; }
  public function getDescription(): string { return $this->description; }
  public function getStartTime(): int { return $this->startTime; }
  public function getUserId(): string { return $this->userId; }
  public function getCreatedAt(): int { return $this->createdAt; }
  public function getLocation(): ?string { return $this->location; }
  public function getTags(): Vector<string> { return $this->tags; }
}

final class ApiResponse<T> {
  public function __construct(
    private bool $success,
    private T $data,
    private ?string $error = null,
    private int $statusCode = 200,
  ) {}

  public function isSuccess(): bool { return $this->success; }
  public function getData(): T { return $this->data; }
  public function getError(): ?string { return $this->error; }
  public function getStatusCode(): int { return $this->statusCode; }

  public static function success<T>(T $data): ApiResponse<T> {
    return new ApiResponse(true, $data);
  }

  public static function error<T>(string $error, int $statusCode = 400): ApiResponse<T> {
    return new ApiResponse(false, null, $error, $statusCode);
  }
}

final class PaginationInfo {
  public function __construct(
    private int $page,
    private int $limit,
    private int $total,
    private int $totalPages,
  ) {}

  public function getPage(): int { return $this->page; }
  public function getLimit(): int { return $this->limit; }
  public function getTotal(): int { return $this->total; }
  public function getTotalPages(): int { return $this->totalPages; }
}

final class PaginatedResponse<T> {
  public function __construct(
    private Vector<T> $items,
    private PaginationInfo $pagination,
  ) {}

  public function getItems(): Vector<T> { return $this->items; }
  public function getPagination(): PaginationInfo { return $this->pagination; }
}