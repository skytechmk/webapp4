<?hh // strict

/**
 * Basic tests for Event Management Service
 */

final class EventServiceTest {
  private EventService $eventService;
  private SQLiteEventRepository $eventRepo;
  private MockUserValidator $userValidator;

  public function __construct() {
    $this->userValidator = new MockUserValidator();
    $this->eventRepo = new SQLiteEventRepository(':memory:');
    $this->eventService = new EventService($this->eventRepo, $this->userValidator);
  }

  public async function testCreateEvent(): Awaitable<void> {
    $request = new CreateEventRequest(
      'Test Event',
      'Test Description',
      time() + 3600, // 1 hour from now
      'user1',
      'Test Location',
      Vector {'tag1', 'tag2'},
    );

    $event = await $this->eventService->createEvent($request);

    assert($event->getTitle() === 'Test Event');
    assert($event->getDescription() === 'Test Description');
    assert($event->getUserId() === 'user1');
    assert($event->getLocation() === 'Test Location');
    assert($event->getTags()->count() === 2);
    assert($event->getTags()[0] === 'tag1');
    assert($event->getTags()[1] === 'tag2');
  }

  public async function testGetEvent(): Awaitable<void> {
    // First create an event
    $createRequest = new CreateEventRequest(
      'Test Event',
      'Test Description',
      time() + 3600,
      'user1',
    );

    $createdEvent = await $this->eventService->createEvent($createRequest);

    // Now get it
    $getRequest = new GetEventRequest($createdEvent->getId());
    $retrievedEvent = await $this->eventService->getEvent($getRequest);

    assert($retrievedEvent->getId() === $createdEvent->getId());
    assert($retrievedEvent->getTitle() === 'Test Event');
  }

  public async function testCreateEventValidation(): Awaitable<void> {
    // Test empty title
    $request = new CreateEventRequest(
      '',
      'Test Description',
      time() + 3600,
      'user1',
    );

    try {
      await $this->eventService->createEvent($request);
      assert(false, 'Should have thrown ValidationException');
    } catch (ValidationException $e) {
      assert($e->getDetails() === 'is required');
    }

    // Test past start time
    $request = new CreateEventRequest(
      'Test Event',
      'Test Description',
      time() - 3600, // 1 hour ago
      'user1',
    );

    try {
      await $this->eventService->createEvent($request);
      assert(false, 'Should have thrown ValidationException');
    } catch (ValidationException $e) {
      assert(strpos($e->getDetails(), 'must be in the future') !== false);
    }
  }

  public async function testListEvents(): Awaitable<void> {
    // Create a few events
    for ($i = 1; $i <= 3; $i++) {
      $request = new CreateEventRequest(
        "Event {$i}",
        "Description {$i}",
        time() + ($i * 3600),
        'user1',
      );
      await $this->eventService->createEvent($request);
    }

    // List events for user
    $listRequest = new ListEventsRequest('user1', 1, 10);
    $response = await $this->eventService->listEvents($listRequest);

    assert($response->getEvents()->count() === 3);
    assert($response->getPagination()->getTotal() === 3);
    assert($response->getPagination()->getPage() === 1);
  }
}

// Simple test runner
async function runTests(): Awaitable<void> {
  $test = new EventServiceTest();

  echo "Running EventService tests...\n";

  try {
    await $test->testCreateEvent();
    echo "✓ testCreateEvent passed\n";

    await $test->testGetEvent();
    echo "✓ testGetEvent passed\n";

    await $test->testCreateEventValidation();
    echo "✓ testCreateEventValidation passed\n";

    await $test->testListEvents();
    echo "✓ testListEvents passed\n";

    echo "All tests passed!\n";
  } catch (Exception $e) {
    echo "Test failed: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
  }
}

// Run tests if this file is executed directly
if (__FILE__ === realpath($_SERVER['SCRIPT_FILENAME'])) {
  HH\Asio\join(runTests());
}