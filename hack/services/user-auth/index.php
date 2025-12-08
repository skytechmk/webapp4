<?hh // strict

/**
 * Main entry point for User Authentication Hack Service
 */

require_once __DIR__ . '/../../shared/types/CommonTypes.php';
require_once __DIR__ . '/../../shared/utils/ErrorHandler.php';
require_once __DIR__ . '/../../shared/utils/AsyncUtils.php';
require_once __DIR__ . '/src/types/AuthTypes.php';
require_once __DIR__ . '/src/repositories/UserRepository.php';
require_once __DIR__ . '/src/services/JwtService.php';
require_once __DIR__ . '/src/services/AuthService.php';
require_once __DIR__ . '/src/controllers/AuthController.php';

// Initialize dependencies
$dbPath = getenv('DATABASE_URL') ?: __DIR__ . '/data/users.db';
$jwtSecret = getenv('JWT_SECRET') ?: 'your-super-secret-jwt-key-change-in-production';

$userRepo = new SQLiteUserRepository($dbPath);
$jwtService = new JwtService($jwtSecret);
$authService = new AuthService($userRepo, $jwtService);
$authController = new AuthController($authService);

// Simple router
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Remove query string from URI
$path = parse_url($requestUri, PHP_URL_PATH);

// Basic routing
switch ($requestMethod) {
  case 'POST':
    if ($path === '/api/auth/register') {
      $response = HH\Asio\join($authController->register());
    } elseif ($path === '/api/auth/login') {
      $response = HH\Asio\join($authController->login());
    } elseif ($path === '/api/auth/validate') {
      $response = HH\Asio\join($authController->validateToken());
    } elseif ($path === '/api/auth/refresh') {
      $response = HH\Asio\join($authController->refreshToken());
    } else {
      $response = ApiResponse::error('Endpoint not found', 404);
    }
    break;

  case 'GET':
    if ($path === '/health') {
      $response = ApiResponse::success(['status' => 'healthy', 'service' => 'user-auth']);
    } elseif (preg_match('#^/api/users/([^/]+)$#', $path, $matches)) {
      $userId = $matches[1];
      $response = HH\Asio\join($authController->getUser($userId));
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
  if ($data instanceof User) {
    return $data->toArray();
  } elseif ($data instanceof AuthResponse) {
    return [
      'user' => $data->getUser()->toArray(),
      'accessToken' => $data->getAccessToken(),
      'refreshToken' => $data->getRefreshToken(),
      'expiresIn' => $data->getExpiresIn(),
    ];
  } elseif ($data instanceof TokenValidationResponse) {
    return [
      'valid' => $data->isValid(),
      'user' => $data->getUser() ? $data->getUser()->toArray() : null,
      'error' => $data->getError(),
    ];
  }

  return $data;
}