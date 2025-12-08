<?hh // strict

/**
 * Repository for Analytics data access with type safety
 */

interface AnalyticsRepositoryInterface {
  public function saveEventView(EventView $view): void;
  public function getEventData(string $eventId, int $startTime, int $endTime): Vector<EventView>;
  public function getUserEventData(string $userId, int $startTime, int $endTime): Vector<EventView>;
  public function getTotalViewsForEvent(string $eventId, int $startTime, int $endTime): int;
  public function getEngagementData(string $eventId, int $startTime, int $endTime): Pair<int, int>;
}

final class SQLiteAnalyticsRepository implements AnalyticsRepositoryInterface {
  public function __construct(private string $dbPath) {
    $this->initializeDatabase();
  }

  private function initializeDatabase(): void {
    $pdo = $this->getConnection();
    $pdo->exec('
      CREATE TABLE IF NOT EXISTS event_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        interactions INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_event_views_event_id ON event_views(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_views_timestamp ON event_views(timestamp);
      CREATE INDEX IF NOT EXISTS idx_event_views_created_at ON event_views(created_at);
    ');
  }

  private function getConnection(): PDO {
    return new PDO("sqlite:{$this->dbPath}");
  }

  public function saveEventView(EventView $view): void {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('
      INSERT INTO event_views (event_id, timestamp, count, interactions, created_at)
      VALUES (?, ?, ?, ?, ?)
    ');

    $stmt->execute([
      $view->getEventId(),
      $view->getTimestamp(),
      $view->getCount(),
      $view->getInteractions(),
      time(),
    ]);
  }

  public function getEventData(string $eventId, int $startTime, int $endTime): Vector<EventView> {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('
      SELECT event_id, timestamp, SUM(count) as count, SUM(interactions) as interactions
      FROM event_views
      WHERE event_id = ? AND timestamp BETWEEN ? AND ?
      GROUP BY event_id, timestamp
      ORDER BY timestamp ASC
    ');

    $stmt->execute([$eventId, $startTime, $endTime]);

    $views = Vector {};
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      $views[] = new EventView(
        $row['event_id'],
        (int) $row['timestamp'],
        (int) $row['count'],
        (int) $row['interactions'],
      );
    }

    return $views;
  }

  public function getUserEventData(string $userId, int $startTime, int $endTime): Vector<EventView> {
    // This would require joining with events table to get user's events
    // For now, return empty vector as this needs integration with event service
    return Vector {};
  }

  public function getTotalViewsForEvent(string $eventId, int $startTime, int $endTime): int {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('
      SELECT SUM(count) as total_views
      FROM event_views
      WHERE event_id = ? AND timestamp BETWEEN ? AND ?
    ');

    $stmt->execute([$eventId, $startTime, $endTime]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    return (int) ($result['total_views'] ?? 0);
  }

  public function getEngagementData(string $eventId, int $startTime, int $endTime): Pair<int, int> {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('
      SELECT SUM(count) as total_views, SUM(interactions) as total_interactions
      FROM event_views
      WHERE event_id = ? AND timestamp BETWEEN ? AND ?
    ');

    $stmt->execute([$eventId, $startTime, $endTime]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    $totalViews = (int) ($result['total_views'] ?? 0);
    $totalInteractions = (int) ($result['total_interactions'] ?? 0);

    return Pair {$totalViews, $totalInteractions};
  }
}