<?hh // strict

/**
 * HTTP controller for authentication endpoints
 */

final class AuthController {
  public function __construct(
    private AuthService $authService,
  ) {}

  public async function register(): Awaitable<ApiResponse<AuthResponse>> {
    try {
      $input = $this->getJsonInput();

      $request = new RegisterRequest(
        $input['email'] ?? '',
        $input['username'] ?? '',
        $input['password'] ?? '',
      );

      $authResponse = await $this->authService->registerUser($request);

      return ApiResponse::success($authResponse);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function login(): Awaitable<ApiResponse<AuthResponse>> {
    try {
      $input = $this->getJsonInput();

      $request = new LoginRequest(
        $input['email'] ?? '',
        $input['password'] ?? '',
      );

      $authResponse = await $this->authService->loginUser($request);

      return ApiResponse::success($authResponse);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function validateToken(): Awaitable<ApiResponse<TokenValidationResponse>> {
    try {
      $input = $this->getJsonInput();

      $request = new ValidateTokenRequest(
        $input['token'] ?? '',
      );

      $validationResponse = await $this->authService->validateToken($request);

      return ApiResponse::success($validationResponse);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function refreshToken(): Awaitable<ApiResponse<AuthResponse>> {
    try {
      $input = $this->getJsonInput();

      $request = new RefreshTokenRequest(
        $input['refreshToken'] ?? '',
      );

      $authResponse = await $this->authService->refreshToken($request);

      return ApiResponse::success($authResponse);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function getUser(string $userId): Awaitable<ApiResponse<User>> {
    try {
      $user = await $this->authService->getUserById($userId);

      return ApiResponse::success($user);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  private function getJsonInput(): array<string, mixed> {
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false) {
      throw new ServiceException('auth', 'input', 'Failed to read request body');
    }

    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
      throw new ValidationException('auth', 'body', 'Invalid JSON');
    }

    return $data;
  }
}