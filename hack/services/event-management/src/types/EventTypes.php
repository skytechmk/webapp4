<?hh // strict

/**
 * Type definitions for Event Management Service
 */

final class CreateEventRequest {
  public function __construct(
    private string $title,
    private string $description,
    private int $startTime,
    private string $userId,
    private ?string $location = null,
    private Vector<string> $tags = Vector {},
  ) {}

  public function getTitle(): string { return $this->title; }
  public function getDescription(): string { return $this->description; }
  public function getStartTime(): int { return $this->startTime; }
  public function getUserId(): string { return $this->userId; }
  public function getLocation(): ?string { return $this->location; }
  public function getTags(): Vector<string> { return $this->tags; }
}

final class UpdateEventRequest {
  public function __construct(
    private string $eventId,
    private ?string $title = null,
    private ?string $description = null,
    private ?int $startTime = null,
    private ?string $location = null,
    private ?Vector<string> $tags = null,
  ) {}

  public function getEventId(): string { return $this->eventId; }
  public function getTitle(): ?string { return $this->title; }
  public function getDescription(): ?string { return $this->description; }
  public function getStartTime(): ?int { return $this->startTime; }
  public function getLocation(): ?string { return $this->location; }
  public function getTags(): ?Vector<string> { return $this->tags; }
}

final class GetEventRequest {
  public function __construct(
    private string $eventId,
  ) {}

  public function getEventId(): string { return $this->eventId; }
}

final class ListEventsRequest {
  public function __construct(
    private ?string $userId = null,
    private ?int $page = 1,
    private ?int $limit = 20,
    private ?string $search = null,
    private ?Vector<string> $tags = null,
  ) {}

  public function getUserId(): ?string { return $this->userId; }
  public function getPage(): int { return $this->page ?? 1; }
  public function getLimit(): int { return $this->limit ?? 20; }
  public function getSearch(): ?string { return $this->search; }
  public function getTags(): ?Vector<string> { return $this->tags; }
}

final class DeleteEventRequest {
  public function __construct(
    private string $eventId,
    private string $userId,
  ) {}

  public function getEventId(): string { return $this->eventId; }
  public function getUserId(): string { return $this->userId; }
}

final class EventResponse {
  public function __construct(private Event $event) {}
  public function getEvent(): Event { return $this->event; }
}

final class EventListResponse {
  public function __construct(
    private Vector<Event> $events,
    private PaginationInfo $pagination,
  ) {}

  public function getEvents(): Vector<Event> { return $this->events; }
  public function getPagination(): PaginationInfo { return $this->pagination; }
}