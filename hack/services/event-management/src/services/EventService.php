<?hh // strict

/**
 * Business logic service for event management
 */

final class EventService {
  public function __construct(
    private EventRepositoryInterface $eventRepo,
    private UserValidator $userValidator,
  ) {}

  public async function createEvent(CreateEventRequest $request): Awaitable<Event> {
    // Validate user
    $user = await $this->userValidator->validateAuthenticatedUser($request->getUserId());

    // Validate input
    $this->validateEventData($request);

    // Generate ID and timestamps
    $eventId = $this->generateId();
    $createdAt = time();

    // Create event entity
    $event = new Event(
      $eventId,
      $request->getTitle(),
      $request->getDescription(),
      $request->getStartTime(),
      $user->getId(),
      $createdAt,
      $request->getLocation(),
      $request->getTags(),
    );

    // Save to repository
    return await async {
      return $this->eventRepo->save($event);
    };
  }

  public async function getEvent(GetEventRequest $request): Awaitable<Event> {
    $event = await async {
      return $this->eventRepo->findById($request->getEventId());
    };

    if ($event === null) {
      throw new NotFoundException('event-management', 'Event', $request->getEventId());
    }

    return $event;
  }

  public async function listEvents(ListEventsRequest $request): Awaitable<EventListResponse> {
    if ($request->getUserId() !== null) {
      // Validate user exists
      await $this->userValidator->validateUserExists($request->getUserId());
    }

    $result = await async {
      if ($request->getSearch() !== null || $request->getTags() !== null) {
        return $this->eventRepo->search(
          $request->getSearch() ?? '',
          $request->getTags(),
          $request->getPage(),
          $request->getLimit()
        );
      } elseif ($request->getUserId() !== null) {
        return $this->eventRepo->findByUserId(
          $request->getUserId(),
          $request->getPage(),
          $request->getLimit()
        );
      } else {
        // General listing - could be implemented differently
        return Pair {Vector {}, 0};
      }
    };

    $events = $result[0];
    $total = $result[1];
    $totalPages = (int) ceil($total / $request->getLimit());

    $pagination = new PaginationInfo(
      $request->getPage(),
      $request->getLimit(),
      $total,
      $totalPages
    );

    return new EventListResponse($events, $pagination);
  }

  public async function updateEvent(UpdateEventRequest $request): Awaitable<Event> {
    // Check if event exists
    $existingEvent = await async {
      return $this->eventRepo->findById($request->getEventId());
    };

    if ($existingEvent === null) {
      throw new NotFoundException('event-management', 'Event', $request->getEventId());
    }

    // Validate ownership (assuming user ID is passed somehow - would need auth context)
    // For now, we'll assume the request includes user validation

    // Prepare updates
    $updates = Map {};
    if ($request->getTitle() !== null) {
      $updates['title'] = $request->getTitle();
    }
    if ($request->getDescription() !== null) {
      $updates['description'] = $request->getDescription();
    }
    if ($request->getStartTime() !== null) {
      $updates['start_time'] = $request->getStartTime();
    }
    if ($request->getLocation() !== null) {
      $updates['location'] = $request->getLocation();
    }
    if ($request->getTags() !== null) {
      $updates['tags'] = $request->getTags();
    }

    // Validate updates
    $this->validateUpdateData($updates);

    $updatedEvent = await async {
      return $this->eventRepo->update($request->getEventId(), $updates);
    };

    if ($updatedEvent === null) {
      throw new ServiceException('event-management', 'update', 'Failed to update event');
    }

    return $updatedEvent;
  }

  public async function deleteEvent(DeleteEventRequest $request): Awaitable<bool> {
    // Check if event exists
    $event = await async {
      return $this->eventRepo->findById($request->getEventId());
    };

    if ($event === null) {
      throw new NotFoundException('event-management', 'Event', $request->getEventId());
    }

    // Validate ownership
    if ($event->getUserId() !== $request->getUserId()) {
      throw new UnauthorizedException('event-management', 'delete');
    }

    return await async {
      return $this->eventRepo->delete($request->getEventId());
    };
  }

  private function validateEventData(CreateEventRequest $request): void {
    ErrorHandler::validateStringLength('event-management', 'title', $request->getTitle(), 1, 200);
    ErrorHandler::validateStringLength('event-management', 'description', $request->getDescription(), 1, 2000);

    if ($request->getStartTime() <= time()) {
      throw new ValidationException('event-management', 'startTime', 'must be in the future');
    }

    if ($request->getLocation() !== null) {
      ErrorHandler::validateStringLength('event-management', 'location', $request->getLocation(), 0, 500);
    }

    foreach ($request->getTags() as $tag) {
      if (strlen($tag) > 50) {
        throw new ValidationException('event-management', 'tags', 'each tag must be 50 characters or less');
      }
    }
  }

  private function validateUpdateData(Map<string, mixed> $updates): void {
    if ($updates->containsKey('title')) {
      ErrorHandler::validateStringLength('event-management', 'title', $updates['title'], 1, 200);
    }
    if ($updates->containsKey('description')) {
      ErrorHandler::validateStringLength('event-management', 'description', $updates['description'], 1, 2000);
    }
    if ($updates->containsKey('start_time') && $updates['start_time'] <= time()) {
      throw new ValidationException('event-management', 'startTime', 'must be in the future');
    }
    if ($updates->containsKey('location')) {
      ErrorHandler::validateStringLength('event-management', 'location', $updates['location'], 0, 500);
    }
    if ($updates->containsKey('tags')) {
      $tags = $updates['tags'];
      if ($tags instanceof Vector) {
        foreach ($tags as $tag) {
          if (strlen($tag) > 50) {
            throw new ValidationException('event-management', 'tags', 'each tag must be 50 characters or less');
          }
        }
      }
    }
  }

  private function generateId(): string {
    return bin2hex(random_bytes(16));
  }
}