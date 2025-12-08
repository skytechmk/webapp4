<?hh // strict

/**
 * Type definitions for Analytics Service
 */

final class EventView {
  public function __construct(
    private string $eventId,
    private int $timestamp,
    private int $count,
    private int $interactions = 0,
  ) {}

  public function getEventId(): string { return $this->eventId; }
  public function getTimestamp(): int { return $this->timestamp; }
  public function getCount(): int { return $this->count; }
  public function getInteractions(): int { return $this->interactions; }
}

final class EventAnalytics {
  public function __construct(
    private int $totalViews,
    private float $engagementRate,
    private Vector<int> $peakHours,
  ) {}

  public function getTotalViews(): int { return $this->totalViews; }
  public function getEngagementRate(): float { return $this->engagementRate; }
  public function getPeakHours(): Vector<int> { return $this->peakHours; }
}

final class GetEventAnalyticsRequest {
  public function __construct(
    private string $eventId,
    private int $startTime,
    private int $endTime,
  ) {}

  public function getEventId(): string { return $this->eventId; }
  public function getStartTime(): int { return $this->startTime; }
  public function getEndTime(): int { return $this->endTime; }
}

final class UserAnalytics {
  public function __construct(
    private string $userId,
    private int $totalEvents,
    private int $totalViews,
    private float $averageEngagement,
    private Vector<string> $topEvents,
  ) {}

  public function getUserId(): string { return $this->userId; }
  public function getTotalEvents(): int { return $this->totalEvents; }
  public function getTotalViews(): int { return $this->totalViews; }
  public function getAverageEngagement(): float { return $this->averageEngagement; }
  public function getTopEvents(): Vector<string> { return $this->topEvents; }
}

final class GetUserAnalyticsRequest {
  public function __construct(
    private string $userId,
    private ?int $startTime = null,
    private ?int $endTime = null,
  ) {}

  public function getUserId(): string { return $this->userId; }
  public function getStartTime(): ?int { return $this->startTime; }
  public function getEndTime(): ?int { return $this->endTime; }
}

final class AnalyticsResponse<T> {
  public function __construct(private T $analytics) {}
  public function getAnalytics(): T { return $this->analytics; }
}