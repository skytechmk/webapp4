<?hh // strict

/**
 * Event entity model
 */

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

  public function withTitle(string $title): Event {
    return new Event(
      $this->id,
      $title,
      $this->description,
      $this->startTime,
      $this->userId,
      $this->createdAt,
      $this->location,
      $this->tags,
    );
  }

  public function withDescription(string $description): Event {
    return new Event(
      $this->id,
      $this->title,
      $description,
      $this->startTime,
      $this->userId,
      $this->createdAt,
      $this->location,
      $this->tags,
    );
  }

  public function withStartTime(int $startTime): Event {
    return new Event(
      $this->id,
      $this->title,
      $this->description,
      $startTime,
      $this->userId,
      $this->createdAt,
      $this->location,
      $this->tags,
    );
  }

  public function withLocation(?string $location): Event {
    return new Event(
      $this->id,
      $this->title,
      $this->description,
      $this->startTime,
      $this->userId,
      $this->createdAt,
      $location,
      $this->tags,
    );
  }

  public function withTags(Vector<string> $tags): Event {
    return new Event(
      $this->id,
      $this->title,
      $this->description,
      $this->startTime,
      $this->userId,
      $this->createdAt,
      $this->location,
      $tags,
    );
  }

  public function toArray(): array<string, mixed> {
    return [
      'id' => $this->id,
      'title' => $this->title,
      'description' => $this->description,
      'startTime' => $this->startTime,
      'userId' => $this->userId,
      'createdAt' => $this->createdAt,
      'location' => $this->location,
      'tags' => $this->tags->toArray(),
    ];
  }
}