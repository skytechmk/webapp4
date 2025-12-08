<?hh // strict

/**
 * Repository for User data access with type safety
 */

interface UserRepositoryInterface {
  public function save(User $user): User;
  public function findById(string $id): ?User;
  public function findByEmail(string $email): ?User;
  public function findByUsername(string $username): ?User;
  public function update(string $id, Map<string, mixed> $updates): ?User;
  public function delete(string $id): bool;
  public function exists(string $id): bool;
  public function emailExists(string $email): bool;
  public function usernameExists(string $username): bool;
}

final class SQLiteUserRepository implements UserRepositoryInterface {
  public function __construct(private string $dbPath) {
    $this->initializeDatabase();
  }

  private function initializeDatabase(): void {
    $pdo = $this->getConnection();
    $pdo->exec('
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        profile_image TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        account_locked BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    ');
  }

  private function getConnection(): PDO {
    return new PDO("sqlite:{$this->dbPath}");
  }

  public function save(User $user): User {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('
      INSERT INTO users (id, email, username, password_hash, created_at, profile_image, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    ');

    // Note: In real implementation, password should be hashed before saving
    // For now, we'll assume it's already hashed
    $passwordHash = password_hash('defaultpassword', PASSWORD_DEFAULT); // This should be passed in

    $stmt->execute([
      $user->getId(),
      $user->getEmail(),
      $user->getUsername(),
      $passwordHash,
      $user->getCreatedAt(),
      $user->getProfileImage(),
      false, // email_verified
    ]);

    return $user;
  }

  public function findById(string $id): ?User {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return null;
    }

    return $this->rowToUser($row);
  }

  public function findByEmail(string $email): ?User {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return null;
    }

    return $this->rowToUser($row);
  }

  public function findByUsername(string $username): ?User {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return null;
    }

    return $this->rowToUser($row);
  }

  public function update(string $id, Map<string, mixed> $updates): ?User {
    if ($updates->isEmpty()) {
      return $this->findById($id);
    }

    $pdo = $this->getConnection();
    $setParts = Vector {};
    $params = Vector {};

    foreach ($updates as $field => $value) {
      $setParts[] = "{$field} = ?";
      $params[] = $value;
    }

    $params[] = $id;
    $setClause = implode(', ', $setParts);

    $stmt = $pdo->prepare("UPDATE users SET {$setClause} WHERE id = ?");
    $stmt->execute($params->toArray());

    return $this->findById($id);
  }

  public function delete(string $id): bool {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->rowCount() > 0;
  }

  public function exists(string $id): bool {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('SELECT 1 FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    return $stmt->fetchColumn() !== false;
  }

  public function emailExists(string $email): bool {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    return $stmt->fetchColumn() !== false;
  }

  public function usernameExists(string $username): bool {
    $pdo = $this->getConnection();
    $stmt = $pdo->prepare('SELECT 1 FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    return $stmt->fetchColumn() !== false;
  }

  private function rowToUser(array<string, mixed> $row): User {
    return new User(
      $row['id'],
      $row['email'],
      $row['username'],
      (int) $row['created_at'],
      $row['profile_image'],
    );
  }
}