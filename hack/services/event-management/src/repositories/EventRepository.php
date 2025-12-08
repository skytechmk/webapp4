<?hh // strict

/**
 * Repository for Event data access with type safety
 */

interface EventRepositoryInterface {
  public function save(Event $event): Event;
  public function findById(string $id): ?Event;
  public function findByUserId(string $userId, int $page = 1, int $limit = 20): Pair<Vector<Event>, int>;
  public function search(string $query, ?Vector<string> $tags = null, int $page = 1, int $limit = 20): Pair<Vector<Event>, int>;
  public function update(string $id, Map<string, mixed> $updates): ?Event;
  public function delete(string $id): bool;
  public function exists(string $id): bool;
}

final class SQLiteEventRepository implements EventRepositoryInterface {
  public function __construct(private string $dbPath) {
    $this->initializeDatabase();
  }

  private function initializeDatabase(): void {
    $pdo = $this->getConnection();
    $pdo->exec('
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        location TEXT,
        tags TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
      CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
      CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    ');
  }

  private function getConnection(): PDO {
    return new PDO("sqlite:{$this->dbPath}");
  }

  public function save(Event $event): Event {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('
      INSERT INTO events (id, title, description, start_time, user_id, created_at, location, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $tagsJson = json_encode($event->getTags()->toArray());

    $stmt->execute([
      $event->getId(),
      $event->getTitle(),
      $event->getDescription(),
      $event->getStartTime(),
      $event->getUserId(),
      $event->getCreatedAt(),
      $event->getLocation(),
      $tagsJson,
    ]);

    return $event;
  }

  public function findById(string $id): ?Event {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('SELECT * FROM events WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return null;
    }

    return $this->rowToEvent($row);
  }

  public function findByUserId(string $userId, int $page = 1, int $limit = 20): Pair<Vector<Event>, int> {
    $pdo = $this->getConnection();
    $offset = ($page - 1) * $limit;

    // Get total count
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM events WHERE user_id = ?');
    $countStmt->execute([$userId]);
    $total = (int) $countStmt->fetchColumn();

    // Get events
    $stmt = $pdo->prepare('
      SELECT * FROM events
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    ');
    $stmt->execute([$userId, $limit, $offset]);

    $events = Vector {};
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      $events[] = $this->rowToEvent($row);
    }

    return Pair {$events, $total};
  }

  public function search(string $query, ?Vector<string> $tags = null, int $page = 1, int $limit = 20): Pair<Vector<Event>, int> {
    $pdo = $this->getConnection();
    $offset = ($page - 1) * $limit;

    $whereConditions = Vector {'(title LIKE ? OR description LIKE ?)'};
    $params = Vector {"%{$query}%", "%{$query}%"};

    if ($tags !== null && !$tags->isEmpty()) {
      $tagConditions = Vector {};
      foreach ($tags as $tag) {
        $tagConditions[] = "tags LIKE ?";
        $params[] = "%\"{$tag}\"%";
      }
      $whereConditions[] = '(' . implode(' OR ', $tagConditions) . ')';
    }

    $whereClause = implode(' AND ', $whereConditions);

    // Get total count
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM events WHERE {$whereClause}");
    $countStmt->execute($params->toArray());
    $total = (int) $countStmt->fetchColumn();

    // Get events
    $stmt = $pdo->prepare("
      SELECT * FROM events
      WHERE {$whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    ");
    $params[] = $limit;
    $params[] = $offset;
    $stmt->execute($params->toArray());

    $events = Vector {};
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      $events[] = $this->rowToEvent($row);
    }

    return Pair {$events, $total};
  }

  public function update(string $id, Map<string, mixed> $updates): ?Event {
    if ($updates->isEmpty()) {
      return $this->findById($id);
    }

    $pdo = $this->getConnection();
    $setParts = Vector {};
    $params = Vector {};

    foreach ($updates as $field => $value) {
      if ($field === 'tags' && $value instanceof Vector) {
        $setParts[] = "{$field} = ?";
        $params[] = json_encode($value->toArray());
      } else {
        $setParts[] = "{$field} = ?";
        $params[] = $value;
      }
    }

    $params[] = $id;
    $setClause = implode(', ', $setParts);

    $stmt = $pdo->prepare("UPDATE events SET {$setClause} WHERE id = ?");
    $stmt->execute($params->toArray());

    return $this->findById($id);
  }

  public function delete(string $id): bool {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('DELETE FROM events WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->rowCount() > 0;
  }

  public function exists(string $id): bool {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('SELECT 1 FROM events WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    return $stmt->fetchColumn() !== false;
  }

  private function rowToEvent(array<string, mixed> $row): Event {
    $tags = Vector {};
    if ($row['tags']) {
      $tagsArray = json_decode($row['tags'], true);
      if (is_array($tagsArray)) {
        $tags = new Vector($tagsArray);
      }
    }

    return new Event(
      $row['id'],
      $row['title'],
      $row['description'],
      (int) $row['start_time'],
      $row['user_id'],
      (int) $row['created_at'],
      $row['location'],
      $tags,
    );
  }
}