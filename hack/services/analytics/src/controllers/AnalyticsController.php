<?hh // strict

/**
 * HTTP controller for analytics endpoints
 */

final class AnalyticsController {
  public function __construct(
    private AnalyticsService $analyticsService,
  ) {}

  public async function getEventAnalytics(): Awaitable<ApiResponse<AnalyticsResponse<EventAnalytics>>> {
    try {
      $queryParams = $this->getQueryParams();

      $eventId = $queryParams['eventId'] ?? '';
      $startTime = isset($queryParams['startTime']) ? (int) $queryParams['startTime'] : (time() - 7 * 24 * 60 * 60);
      $endTime = isset($queryParams['endTime']) ? (int) $queryParams['endTime'] : time();

      if ($eventId === '') {
        throw new ValidationException('analytics', 'eventId', 'is required');
      }

      $analytics = await $this->analyticsService->getEventAnalytics($eventId, $startTime, $endTime);
      $response = new AnalyticsResponse($analytics);

      return ApiResponse::success($response);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function getUserAnalytics(): Awaitable<ApiResponse<AnalyticsResponse<UserAnalytics>>> {
    try {
      $queryParams = $this->getQueryParams();

      $userId = $queryParams['userId'] ?? '';
      $startTime = isset($queryParams['startTime']) ? (int) $queryParams['startTime'] : null;
      $endTime = isset($queryParams['endTime']) ? (int) $queryParams['endTime'] : null;

      if ($userId === '') {
        throw new ValidationException('analytics', 'userId', 'is required');
      }

      $analytics = await $this->analyticsService->getUserAnalytics($userId, $startTime, $endTime);
      $response = new AnalyticsResponse($analytics);

      return ApiResponse::success($response);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function recordEventView(): Awaitable<ApiResponse<bool>> {
    try {
      $input = $this->getJsonInput();

      $view = new EventView(
        $input['eventId'] ?? '',
        (int) ($input['timestamp'] ?? time()),
        (int) ($input['count'] ?? 1),
        (int) ($input['interactions'] ?? 0),
      );

      await $this->analyticsService->recordEventView($view);

      return ApiResponse::success(true);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  private function getJsonInput(): array<string, mixed> {
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false) {
      throw new ServiceException('analytics', 'input', 'Failed to read request body');
    }

    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
      throw new ValidationException('analytics', 'body', 'Invalid JSON');
    }

    return $data;
  }

  private function getQueryParams(): array<string, mixed> {
    return $_GET;
  }
}