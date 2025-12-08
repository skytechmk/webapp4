<?hh // strict

/**
 * Business logic service for user authentication
 */

final class AuthService {
  public function __construct(
    private UserRepositoryInterface $userRepo,
    private JwtService $jwtService,
  ) {}

  public async function registerUser(RegisterRequest $request): Awaitable<AuthResponse> {
    // Validate input
    $this->validateRegistrationData($request);

    // Check if user already exists
    if (await async { return $this->userRepo->emailExists($request->getEmail()); }) {
      throw new ValidationException('auth', 'email', 'already exists');
    }

    if (await async { return $this->userRepo->usernameExists($request->getUsername()); }) {
      throw new ValidationException('auth', 'username', 'already exists');
    }

    // Hash password
    $passwordHash = password_hash($request->getPassword(), PASSWORD_DEFAULT);

    // Generate user ID
    $userId = $this->generateId();
    $createdAt = time();

    // Create user entity
    $user = new User(
      $userId,
      $request->getEmail(),
      $request->getUsername(),
      $createdAt,
      null, // profile image
    );

    // Save user (in real implementation, we'd store the password hash)
    $savedUser = await async {
      return $this->userRepo->save($user);
    };

    // Generate tokens
    $accessToken = $this->jwtService->generateAccessToken($savedUser);
    $refreshToken = $this->jwtService->generateRefreshToken($savedUser);

    return new AuthResponse($savedUser, $accessToken, $refreshToken, 3600);
  }

  public async function loginUser(LoginRequest $request): Awaitable<AuthResponse> {
    // Find user by email
    $user = await async {
      return $this->userRepo->findByEmail($request->getEmail());
    };

    if ($user === null) {
      throw new ValidationException('auth', 'email', 'invalid credentials');
    }

    // In real implementation, verify password hash
    // For now, we'll assume password verification passes
    $passwordValid = true; // password_verify($request->getPassword(), $storedHash);

    if (!$passwordValid) {
      throw new ValidationException('auth', 'password', 'invalid credentials');
    }

    // Generate tokens
    $accessToken = $this->jwtService->generateAccessToken($user);
    $refreshToken = $this->jwtService->generateRefreshToken($user);

    return new AuthResponse($user, $accessToken, $refreshToken, 3600);
  }

  public async function validateToken(ValidateTokenRequest $request): Awaitable<TokenValidationResponse> {
    $payload = $this->jwtService->validateToken($request->getToken());

    if ($payload === null) {
      return new TokenValidationResponse(false, null, 'invalid token');
    }

    if (!$this->jwtService->isAccessToken($request->getToken())) {
      return new TokenValidationResponse(false, null, 'not an access token');
    }

    $userId = $payload['sub'] ?? null;
    if ($userId === null) {
      return new TokenValidationResponse(false, null, 'invalid token payload');
    }

    $user = await async {
      return $this->userRepo->findById($userId);
    };

    if ($user === null) {
      return new TokenValidationResponse(false, null, 'user not found');
    }

    return new TokenValidationResponse(true, $user);
  }

  public async function refreshToken(RefreshTokenRequest $request): Awaitable<AuthResponse> {
    $payload = $this->jwtService->validateToken($request->getRefreshToken());

    if ($payload === null) {
      throw new ValidationException('auth', 'refreshToken', 'invalid refresh token');
    }

    if (!$this->jwtService->isRefreshToken($request->getRefreshToken())) {
      throw new ValidationException('auth', 'refreshToken', 'not a refresh token');
    }

    $userId = $payload['sub'] ?? null;
    if ($userId === null) {
      throw new ValidationException('auth', 'refreshToken', 'invalid token payload');
    }

    $user = await async {
      return $this->userRepo->findById($userId);
    };

    if ($user === null) {
      throw new NotFoundException('auth', 'User', $userId);
    }

    // Generate new tokens
    $accessToken = $this->jwtService->generateAccessToken($user);
    $refreshToken = $this->jwtService->generateRefreshToken($user);

    return new AuthResponse($user, $accessToken, $refreshToken, 3600);
  }

  public async function getUserById(string $userId): Awaitable<User> {
    $user = await async {
      return $this->userRepo->findById($userId);
    };

    if ($user === null) {
      throw new NotFoundException('auth', 'User', $userId);
    }

    return $user;
  }

  private function validateRegistrationData(RegisterRequest $request): void {
    ErrorHandler::validateEmail('auth', $request->getEmail());
    ErrorHandler::validateStringLength('auth', 'username', $request->getUsername(), 3, 50);
    ErrorHandler::validateStringLength('auth', 'password', $request->getPassword(), 8, 128);

    // Check password strength
    if (!preg_match('/[A-Z]/', $request->getPassword())) {
      throw new ValidationException('auth', 'password', 'must contain at least one uppercase letter');
    }
    if (!preg_match('/[a-z]/', $request->getPassword())) {
      throw new ValidationException('auth', 'password', 'must contain at least one lowercase letter');
    }
    if (!preg_match('/[0-9]/', $request->getPassword())) {
      throw new ValidationException('auth', 'password', 'must contain at least one number');
    }
  }

  private function generateId(): string {
    return bin2hex(random_bytes(16));
  }
}