<?hh // strict

/**
 * JWT token service for authentication
 */

final class JwtService {
  public function __construct(
    private string $secretKey,
    private string $issuer = 'snapify-hack-auth',
    private int $accessTokenExpiry = 3600, // 1 hour
    private int $refreshTokenExpiry = 604800, // 7 days
  ) {}

  public function generateAccessToken(User $user): string {
    $header = $this->base64UrlEncode(json_encode([
      'alg' => 'HS256',
      'typ' => 'JWT',
    ]));

    $payload = $this->base64UrlEncode(json_encode([
      'iss' => $this->issuer,
      'sub' => $user->getId(),
      'email' => $user->getEmail(),
      'username' => $user->getUsername(),
      'iat' => time(),
      'exp' => time() + $this->accessTokenExpiry,
      'type' => 'access',
    ]));

    $signature = $this->generateSignature($header . '.' . $payload);

    return $header . '.' . $payload . '.' . $signature;
  }

  public function generateRefreshToken(User $user): string {
    $header = $this->base64UrlEncode(json_encode([
      'alg' => 'HS256',
      'typ' => 'JWT',
    ]));

    $payload = $this->base64UrlEncode(json_encode([
      'iss' => $this->issuer,
      'sub' => $user->getId(),
      'iat' => time(),
      'exp' => time() + $this->refreshTokenExpiry,
      'type' => 'refresh',
    ]));

    $signature = $this->generateSignature($header . '.' . $payload);

    return $header . '.' . $payload . '.' . $signature;
  }

  public function validateToken(string $token): ?array<string, mixed> {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
      return null;
    }

    list($header, $payload, $signature) = $parts;

    // Verify signature
    $expectedSignature = $this->generateSignature($header . '.' . $payload);
    if (!$this->constantTimeCompare($signature, $expectedSignature)) {
      return null;
    }

    // Decode payload
    $payloadData = json_decode($this->base64UrlDecode($payload), true);
    if ($payloadData === null) {
      return null;
    }

    // Check expiry
    if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
      return null;
    }

    // Check issuer
    if (isset($payloadData['iss']) && $payloadData['iss'] !== $this->issuer) {
      return null;
    }

    return $payloadData;
  }

  public function getUserIdFromToken(string $token): ?string {
    $payload = $this->validateToken($token);
    return $payload !== null && isset($payload['sub']) ? $payload['sub'] : null;
  }

  public function isAccessToken(string $token): bool {
    $payload = $this->validateToken($token);
    return $payload !== null && isset($payload['type']) && $payload['type'] === 'access';
  }

  public function isRefreshToken(string $token): bool {
    $payload = $this->validateToken($token);
    return $payload !== null && isset($payload['type']) && $payload['type'] === 'refresh';
  }

  private function generateSignature(string $data): string {
    return $this->base64UrlEncode(hash_hmac('sha256', $data, $this->secretKey, true));
  }

  private function base64UrlEncode(string $data): string {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
  }

  private function base64UrlDecode(string $data): string {
    $remainder = strlen($data) % 4;
    if ($remainder) {
      $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
  }

  private function constantTimeCompare(string $a, string $b): bool {
    if (strlen($a) !== strlen($b)) {
      return false;
    }

    $result = 0;
    for ($i = 0; $i < strlen($a); $i++) {
      $result |= ord($a[$i]) ^ ord($b[$i]);
    }

    return $result === 0;
  }
}