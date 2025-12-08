<?hh // strict

/**
 * Type definitions for User Authentication Service
 */

final class LoginRequest {
  public function __construct(
    private string $email,
    private string $password,
  ) {}

  public function getEmail(): string { return $this->email; }
  public function getPassword(): string { return $this->password; }
}

final class RegisterRequest {
  public function __construct(
    private string $email,
    private string $username,
    private string $password,
  ) {}

  public function getEmail(): string { return $this->email; }
  public function getUsername(): string { return $this->username; }
  public function getPassword(): string { return $this->password; }
}

final class ValidateTokenRequest {
  public function __construct(
    private string $token,
  ) {}

  public function getToken(): string { return $this->token; }
}

final class RefreshTokenRequest {
  public function __construct(
    private string $refreshToken,
  ) {}

  public function getRefreshToken(): string { return $this->refreshToken; }
}

final class AuthResponse {
  public function __construct(
    private User $user,
    private string $accessToken,
    private string $refreshToken,
    private int $expiresIn,
  ) {}

  public function getUser(): User { return $this->user; }
  public function getAccessToken(): string { return $this->accessToken; }
  public function getRefreshToken(): string { return $this->refreshToken; }
  public function getExpiresIn(): int { return $this->expiresIn; }
}

final class TokenValidationResponse {
  public function __construct(
    private bool $valid,
    private ?User $user = null,
    private ?string $error = null,
  ) {}

  public function isValid(): bool { return $this->valid; }
  public function getUser(): ?User { return $this->user; }
  public function getError(): ?string { return $this->error; }
}

final class PasswordResetRequest {
  public function __construct(
    private string $email,
  ) {}

  public function getEmail(): string { return $this->email; }
}

final class PasswordResetConfirmRequest {
  public function __construct(
    private string $token,
    private string $newPassword,
  ) {}

  public function getToken(): string { return $this->token; }
  public function getNewPassword(): string { return $this->newPassword; }
}