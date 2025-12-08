<?hh // strict

/**
 * User validation service that integrates with Node.js auth service
 */

interface UserValidatorInterface {
  public function validateAuthenticatedUser(string $userId): Awaitable<User>;
  public function validateUserExists(string $userId): Awaitable<bool>;
}

final class NodeJsUserValidator implements UserValidatorInterface {
  public function __construct(
    private string $nodejsServiceUrl,
    private AsyncUtils $asyncUtils,
  ) {}

  public async function validateAuthenticatedUser(string $userId): Awaitable<User> {
    try {
      $user = await $this->fetchUserFromNodeJs($userId);

      if ($user === null) {
        throw new NotFoundException('event-management', 'User', $userId);
      }

      return $user;

    } catch (Exception $e) {
      // Log the error and rethrow
      error_log("User validation failed for user {$userId}: " . $e->getMessage());
      throw $e;
    }
  }

  public async function validateUserExists(string $userId): Awaitable<bool> {
    try {
      $user = await $this->fetchUserFromNodeJs($userId);
      return $user !== null;
    } catch (Exception $e) {
      return false;
    }
  }

  private async function fetchUserFromNodeJs(string $userId): Awaitable<?User> {
    $url = $this->nodejsServiceUrl . "/api/users/{$userId}";

    // Use circuit breaker for fault tolerance
    $circuitBreaker = new AsyncUtils::CircuitBreaker();

    $fetchOperation = async function() use ($url): Awaitable<?User> {
      $ch = curl_init();
      curl_setopt($ch, CURLOPT_URL, $url);
      curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
      curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
      ]);
      curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 second timeout

      $response = curl_exec($ch);
      $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
      curl_close($ch);

      if ($httpCode === 200 && $response !== false) {
        $data = json_decode($response, true);
        if ($data !== null && isset($data['user'])) {
          return $this->createUserFromResponse($data['user']);
        }
      } elseif ($httpCode === 404) {
        return null;
      }

      throw new ServiceException('user-validator', 'fetch', 'Failed to fetch user from Node.js service');
    };

    return await $circuitBreaker->execute($fetchOperation());
  }

  private function createUserFromResponse(array<string, mixed> $userData): User {
    return new User(
      $userData['id'] ?? '',
      $userData['email'] ?? '',
      $userData['username'] ?? '',
      (int) ($userData['createdAt'] ?? time()),
      $userData['profileImage'] ?? null,
    );
  }
}

// Mock validator for testing/development
final class MockUserValidator implements UserValidatorInterface {
  private Map<string, User> $mockUsers = Map {};

  public function __construct() {
    // Add some mock users
    $this->mockUsers['user1'] = new User('user1', 'user1@example.com', 'user1', time(), null);
    $this->mockUsers['user2'] = new User('user2', 'user2@example.com', 'user2', time(), null);
  }

  public async function validateAuthenticatedUser(string $userId): Awaitable<User> {
    $user = $this->mockUsers->get($userId);
    if ($user === null) {
      throw new NotFoundException('event-management', 'User', $userId);
    }
    return $user;
  }

  public async function validateUserExists(string $userId): Awaitable<bool> {
    return $this->mockUsers->containsKey($userId);
  }
}