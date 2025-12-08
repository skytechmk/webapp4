<?hh // strict

/**
 * HTTP controller for event management endpoints
 */

final class EventController {
  public function __construct(
    private EventService $eventService,
  ) {}

  public async function createEvent(): Awaitable<ApiResponse<EventResponse>> {
    try {
      $input = $this->getJsonInput();

      $request = new CreateEventRequest(
        $input['title'] ?? '',
        $input['description'] ?? '',
        (int) ($input['startTime'] ?? 0),
        $input['userId'] ?? '',
        $input['location'] ?? null,
        $this->parseTags($input['tags'] ?? Vector {}),
      );

      $event = await $this->eventService->createEvent($request);
      $response = new EventResponse($event);

      return ApiResponse::success($response);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function getEvent(string $eventId): Awaitable<ApiResponse<EventResponse>> {
    try {
      $request = new GetEventRequest($eventId);
      $event = await $this->eventService->getEvent($request);
      $response = new EventResponse($event);

      return ApiResponse::success($response);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function listEvents(): Awaitable<ApiResponse<EventListResponse>> {
    try {
      $queryParams = $this->getQueryParams();

      $request = new ListEventsRequest(
        $queryParams['userId'] ?? null,
        (int) ($queryParams['page'] ?? 1),
        (int) ($queryParams['limit'] ?? 20),
        $queryParams['search'] ?? null,
        $this->parseTags($queryParams['tags'] ?? Vector {}),
      );

      $response = await $this->eventService->listEvents($request);

      return ApiResponse::success($response);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function updateEvent(string $eventId): Awaitable<ApiResponse<EventResponse>> {
    try {
      $input = $this->getJsonInput();

      $request = new UpdateEventRequest(
        $eventId,
        $input['title'] ?? null,
        $input['description'] ?? null,
        isset($input['startTime']) ? (int) $input['startTime'] : null,
        $input['location'] ?? null,
        isset($input['tags']) ? $this->parseTags($input['tags']) : null,
      );

      $event = await $this->eventService->updateEvent($request);
      $response = new EventResponse($event);

      return ApiResponse::success($response);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  public async function deleteEvent(string $eventId): Awaitable<ApiResponse<bool>> {
    try {
      $input = $this->getJsonInput();
      $userId = $input['userId'] ?? '';

      $request = new DeleteEventRequest($eventId, $userId);
      $result = await $this->eventService->deleteEvent($request);

      return ApiResponse::success($result);

    } catch (Exception $e) {
      return ErrorHandler::handleException($e);
    }
  }

  private function getJsonInput(): array<string, mixed> {
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false) {
      throw new ServiceException('event-management', 'input', 'Failed to read request body');
    }

    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
      throw new ValidationException('event-management', 'body', 'Invalid JSON');
    }

    return $data;
  }

  private function getQueryParams(): array<string, mixed> {
    return $_GET;
  }

  private function parseTags(mixed $tagsInput): Vector<string> {
    $tags = Vector {};

    if (is_array($tagsInput)) {
      foreach ($tagsInput as $tag) {
        if (is_string($tag)) {
          $tags[] = $tag;
        }
      }
    } elseif (is_string($tagsInput)) {
      // Handle comma-separated string
      $tagStrings = explode(',', $tagsInput);
      foreach ($tagStrings as $tag) {
        $trimmed = trim($tag);
        if ($trimmed !== '') {
          $tags[] = $trimmed;
        }
      }
    }

    return $tags;
  }
}