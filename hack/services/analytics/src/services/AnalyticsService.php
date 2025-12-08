<?hh // strict

/**
 * Business logic service for analytics
 */

final class AnalyticsService {
  public function __construct(
    private AnalyticsRepositoryInterface $analyticsRepo,
    private Cache<EventAnalytics> $cache,
  ) {}

  public async function getEventAnalytics(
    string $eventId,
    int $startTime,
    int $endTime,
  ): Awaitable<EventAnalytics> {
    $cacheKey = $eventId . ':' . $startTime . ':' . $endTime;

    $cached = $this->cache->get($cacheKey);
    if ($cached !== null) {
      return $cached;
    }

    $rawData = await async {
      return $this->analyticsRepo->getEventData($eventId, $startTime, $endTime);
    };

    $analytics = new EventAnalytics(
      $this->calculateTotalViews($rawData),
      $this->calculateEngagementRate($rawData),
      $this->findPeakHours($rawData),
    );

    $this->cache->set($cacheKey, $analytics, 3600); // Cache for 1 hour

    return $analytics;
  }

  public async function getUserAnalytics(
    string $userId,
    ?int $startTime = null,
    ?int $endTime = null,
  ): Awaitable<UserAnalytics> {
    $startTime = $startTime ?? (time() - 30 * 24 * 60 * 60); // 30 days ago
    $endTime = $endTime ?? time();

    $userEventData = await async {
      return $this->analyticsRepo->getUserEventData($userId, $startTime, $endTime);
    };

    // Group by event
    $eventStats = Map {};
    foreach ($userEventData as $view) {
      $eventId = $view->getEventId();
      if (!$eventStats->containsKey($eventId)) {
        $eventStats[$eventId] = ['views' => 0, 'interactions' => 0];
      }
      $eventStats[$eventId]['views'] += $view->getCount();
      $eventStats[$eventId]['interactions'] += $view->getInteractions();
    }

    $totalEvents = $eventStats->count();
    $totalViews = $eventStats->values()->map($stat ==> $stat['views'])->sum();
    $totalInteractions = $eventStats->values()->map($stat ==> $stat['interactions'])->sum();

    $averageEngagement = $totalViews > 0 ? (float) $totalInteractions / $totalViews : 0.0;

    // Find top events by views
    $topEvents = $eventStats
      ->toVector()
      ->sortByDesc($stat ==> $stat[1]['views'])
      ->take(5)
      ->map($stat ==> $stat[0]);

    return new UserAnalytics(
      $userId,
      $totalEvents,
      $totalViews,
      $averageEngagement,
      $topEvents,
    );
  }

  public async function recordEventView(EventView $view): Awaitable<void> {
    // Invalidate cache for this event
    $this->invalidateEventCache($view->getEventId());

    await async {
      $this->analyticsRepo->saveEventView($view);
    };
  }

  private function calculateTotalViews(Vector<EventView> $views): int {
    return $views->map($view ==> $view->getCount())->sum();
  }

  private function calculateEngagementRate(Vector<EventView> $views): float {
    $totalViews = $this->calculateTotalViews($views);
    $totalInteractions = $views->map($view ==> $view->getInteractions())->sum();

    return $totalViews > 0 ? (float) $totalInteractions / $totalViews : 0.0;
  }

  private function findPeakHours(Vector<EventView> $views): Vector<int> {
    $hourlyStats = Map {};
    foreach ($views as $view) {
      $hour = (int) ($view->getTimestamp() / 3600);
      $hourlyStats[$hour] = ($hourlyStats[$hour] ?? 0) + $view->getCount();
    }

    return $hourlyStats
      ->toVector()
      ->sortByDesc($stat ==> $stat[1])
      ->take(3)
      ->map($stat ==> $stat[0]);
  }

  private function invalidateEventCache(string $eventId): void {
    // In a real implementation, you'd need to invalidate all cache keys for this event
    // For now, we'll skip this as it requires a more sophisticated cache implementation
  }
}