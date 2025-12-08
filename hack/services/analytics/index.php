<?hh // strict

/**
 * Main entry point for Analytics Hack Service
 */

require_once __DIR__ . '/../../shared/types/CommonTypes.php';
require_once __DIR__ . '/../../shared/utils/ErrorHandler.php';
require_once __DIR__ . '/../../shared/utils/AsyncUtils.php';
require_once __DIR__ . '/src/types/AnalyticsTypes.php';
require_once __DIR__ . '/src/repositories/AnalyticsRepository.php';
require_once __DIR__ . '/src/services/AnalyticsService.php';
require_once __DIR__ . '/src/controllers/AnalyticsController.php';

// Initialize dependencies
$dbPath = getenv('DATABASE_URL') ?: __DIR__ . '/data/analytics.db';

// Simple in-memory cache implementation
final class SimpleCache<T> {
  private Map<string, T> $cache = Map {};
  private Map<string, int> $expiry = Map {};

  public function get(string $key): ?T {
    if (!$this->cache->containsKey($key)) {
      return null;
    }

    if ($this->expiry->containsKey($key) && $this->expiry[$key] < time()) {
      $this->cache->remove($key);
      $this->expiry->remove($key);
      return null;
    }

    return $this->cache[$key];
  }

  public function set(string $key, T $value, int $ttlSeconds): void {
    $this->cache[$key] = $value;
    $this->expiry[$key] = time() + $ttlSeconds;
  }
}

$analyticsRepo = new SQLiteAnalyticsRepository($dbPath);
$cache = new SimpleCache();
$analyticsService = new AnalyticsService($analyticsRepo, $cache);
$analyticsController = new AnalyticsController($analyticsService);

// Simple router
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Remove query string from URI
$path = parse_url($requestUri, PHP_URL_PATH);

// Basic routing
switch ($requestMethod) {
  case 'GET':
    if ($path === '/api/analytics/events') {
      $response = HH\Asio\join($analyticsController->getEventAnalytics());
    } elseif ($path === '/api/analytics/users') {
      $response = HH\Asio\join($analyticsController->getUserAnalytics());
    } elseif ($path === '/health') {
      $response = ApiResponse::success(['status' => 'healthy', 'service' => 'analytics']);
    } else {
      $response = ApiResponse::error('Endpoint not found', 404);
    }
    break;

  case 'POST':
    if ($path === '/api/analytics/views') {
      $response = HH\Asio\join($analyticsController->recordEventView());
    } else {
      $response = ApiResponse::error('Endpoint not found', 404);
    }
    break;

  default:
    $response = ApiResponse::error('Method not allowed', 405);
    break;
}

// Set response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($requestMethod === 'OPTIONS') {
  http_response_code(200);
  exit;
}

// Set HTTP status code
http_response_code($response->getStatusCode());

// Output response
echo json_encode([
  'success' => $response->isSuccess(),
  'data' => $response->isSuccess() ? $this->serializeResponseData($response->getData()) : null,
  'error' => $response->getError(),
]);

function serializeResponseData(mixed $data): mixed {
  if ($data instanceof AnalyticsResponse) {
    $analytics = $data->getAnalytics();

    if ($analytics instanceof EventAnalytics) {
      return [
        'totalViews' => $analytics->getTotalViews(),
        'engagementRate' => $analytics->getEngagementRate(),
        'peakHours' => $analytics->getPeakHours()->toArray(),
      ];
    } elseif ($analytics instanceof UserAnalytics) {
      return [
        'userId' => $analytics->getUserId(),
        'totalEvents' => $analytics->getTotalEvents(),
        'totalViews' => $analytics->getTotalViews(),
        'averageEngagement' => $analytics->getAverageEngagement(),
        'topEvents' => $analytics->getTopEvents()->toArray(),
      ];
    }
  }

  return $data;
}