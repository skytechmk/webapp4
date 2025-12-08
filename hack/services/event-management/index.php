<?hh // strict

/**
 * Main entry point for Event Management Hack Service
 */

require_once __DIR__ . '/../../shared/types/CommonTypes.php';
require_once __DIR__ . '/../../shared/utils/ErrorHandler.php';
require_once __DIR__ . '/../../shared/utils/AsyncUtils.php';
require_once __DIR__ . '/src/types/EventTypes.php';
require_once __DIR__ . '/src/models/Event.php';
require_once __DIR__ . '/src/models/UserValidator.php';
require_once __DIR__ . '/src/repositories/EventRepository.php';
require_once __DIR__ . '/src/services/EventService.php';
require_once __DIR__ . '/src/controllers/EventController.php';

// Initialize dependencies
$dbPath = getenv('DATABASE_URL') ?: __DIR__ . '/data/events.db';
$nodejsServiceUrl = getenv('NODEJS_SERVICE_URL') ?: 'http://localhost:3000';

// Use mock validator in development, NodeJsUserValidator in production
$userValidator = new MockUserValidator(); // Change to NodeJsUserValidator for production

$eventRepo = new SQLiteEventRepository($dbPath);
$asyncUtils = new AsyncUtils();
$eventService = new EventService($eventRepo, $userValidator);
$eventController = new EventController($eventService);

// Simple router
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Remove query string from URI
$path = parse_url($requestUri, PHP_URL_PATH);

// Basic routing
switch ($requestMethod) {
  case 'POST':
    if ($path === '/api/events') {
      $response = HH\Asio\join($eventController->createEvent());
    } elseif (preg_match('#^/api/events/([^/]+)/delete$#', $path, $matches)) {
      $eventId = $matches[1];
      $response = HH\Asio\join($eventController->deleteEvent($eventId));
    } else {
      $response = ApiResponse::error('Endpoint not found', 404);
    }
    break;

  case 'GET':
    if ($path === '/api/events') {
      $response = HH\Asio\join($eventController->listEvents());
    } elseif (preg_match('#^/api/events/([^/]+)$#', $path, $matches)) {
      $eventId = $matches[1];
      $response = HH\Asio\join($eventController->getEvent($eventId));
    } elseif ($path === '/health') {
      $response = ApiResponse::success(['status' => 'healthy', 'service' => 'event-management']);
    } else {
      $response = ApiResponse::error('Endpoint not found', 404);
    }
    break;

  case 'PUT':
    if (preg_match('#^/api/events/([^/]+)$#', $path, $matches)) {
      $eventId = $matches[1];
      $response = HH\Asio\join($eventController->updateEvent($eventId));
    } else {
      $response = ApiResponse::error('Endpoint not found', 404);
    }
    break;

  case 'DELETE':
    if (preg_match('#^/api/events/([^/]+)$#', $path, $matches)) {
      $eventId = $matches[1];
      $response = HH\Asio\join($eventController->deleteEvent($eventId));
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
  if ($data instanceof Event) {
    return $data->toArray();
  } elseif ($data instanceof EventListResponse) {
    return [
      'events' => $data->getEvents()->map($event ==> $event->toArray())->toArray(),
      'pagination' => [
        'page' => $data->getPagination()->getPage(),
        'limit' => $data->getPagination()->getLimit(),
        'total' => $data->getPagination()->getTotal(),
        'totalPages' => $data->getPagination()->getTotalPages(),
      ],
    ];
  } elseif ($data instanceof EventResponse) {
    return ['event' => $data->getEvent()->toArray()];
  }

  return $data;
}