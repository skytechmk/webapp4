import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaSearch, FaLightbulb } from 'react-icons/fa'
import ApiEndpointCard from '../components/ApiEndpointCard'
import CodeBlock from '../components/CodeBlock'
import { useTheme } from '../context/ThemeContext'

const ApiReference = () => {
  const { isDarkMode } = useTheme()
  const [activeSection, setActiveSection] = useState('authentication')

  const apiEndpoints = {
    authentication: [
      {
        title: 'User Login',
        method: 'POST',
        endpoint: '/api/auth/login',
        description: 'Authenticate user with email and password to receive JWT token.',
        requestExample: `const response = await fetch('https://api.snapify.com/v1/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword123'
  })
});`,
        responseExample: `{
  "success": true,
  "user": {
    "id": "user-123456789",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`,
        parameters: [
          { name: 'email', type: 'string', required: true, description: 'User email address' },
          { name: 'password', type: 'string', required: true, description: 'User password' }
        ]
      },
      {
        title: 'Google Authentication',
        method: 'POST',
        endpoint: '/api/auth/google',
        description: 'Authenticate user with Google OAuth credentials.',
        requestExample: `const response = await fetch('https://api.snapify.com/v1/api/auth/google', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    credential: 'google_id_token'
  })
});`,
        responseExample: `{
  "success": true,
  "user": {
    "id": "user-123456789",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`,
        parameters: [
          { name: 'credential', type: 'string', required: true, description: 'Google ID token' }
        ]
      }
    ],
    events: [
      {
        title: 'Create Event',
        method: 'POST',
        endpoint: '/api/events',
        description: 'Create a new event with custom settings and access controls.',
        requestExample: `const response = await fetch('https://api.snapify.com/v1/api/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_jwt_token'
  },
  body: JSON.stringify({
    title: 'Summer Party',
    hostId: 'user-123456789',
    date: '2023-12-25',
    description: 'Annual summer celebration',
    location: 'Beach Club',
    pin: '1234',
    isPublic: true
  })
});`,
        responseExample: `{
  "success": true,
  "event": {
    "id": "event-123456789",
    "title": "Summer Party",
    "hostId": "user-123456789",
    "date": "2023-12-25",
    "description": "Annual summer celebration",
    "location": "Beach Club",
    "pin": "1234",
    "isPublic": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}`,
        parameters: [
          { name: 'title', type: 'string', required: true, description: 'Event title' },
          { name: 'hostId', type: 'string', required: true, description: 'Host user ID' },
          { name: 'date', type: 'string', required: true, description: 'Event date (YYYY-MM-DD)' },
          { name: 'description', type: 'string', required: false, description: 'Event description' },
          { name: 'location', type: 'string', required: false, description: 'Event location' },
          { name: 'pin', type: 'string', required: false, description: 'Access PIN code' },
          { name: 'isPublic', type: 'boolean', required: false, description: 'Public event flag' }
        ]
      },
      {
        title: 'Get Event by ID',
        method: 'GET',
        endpoint: '/api/events/{eventId}',
        description: 'Retrieve detailed information about a specific event.',
        requestExample: `const response = await fetch('https://api.snapify.com/v1/api/events/event-123456789', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});`,
        responseExample: `{
  "success": true,
  "event": {
    "id": "event-123456789",
    "title": "Summer Party",
    "hostId": "user-123456789",
    "date": "2023-12-25",
    "description": "Annual summer celebration",
    "location": "Beach Club",
    "pin": "1234",
    "isPublic": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}`,
        parameters: [
          { name: 'eventId', type: 'string', required: true, description: 'Event ID in path' }
        ]
      }
    ],
    media: [
      {
        title: 'Upload Media',
        method: 'POST',
        endpoint: '/api/media',
        description: 'Upload photos or videos to an event with metadata.',
        requestExample: `const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('eventId', 'event-123456789');
formData.append('metadata', JSON.stringify({
  caption: 'Party photo',
  uploaderName: 'John Doe'
}));

const response = await fetch('https://api.snapify.com/v1/api/media', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  },
  body: formData
});`,
        responseExample: `{
  "success": true,
  "media": {
    "id": "media-123456789",
    "eventId": "event-123456789",
    "url": "https://cdn.snapify.com/media/media-123456789.jpg",
    "thumbnailUrl": "https://cdn.snapify.com/media/media-123456789-thumb.jpg",
    "type": "image",
    "caption": "Party photo",
    "uploaderName": "John Doe",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}`,
        parameters: [
          { name: 'file', type: 'file', required: true, description: 'Media file to upload' },
          { name: 'eventId', type: 'string', required: true, description: 'Target event ID' },
          { name: 'metadata', type: 'object', required: false, description: 'Additional metadata as JSON' }
        ]
      },
      {
        title: 'Get Media by Event',
        method: 'GET',
        endpoint: '/api/media/event/{eventId}',
        description: 'Retrieve all media items for a specific event.',
        requestExample: `const response = await fetch('https://api.snapify.com/v1/api/media/event/event-123456789', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});`,
        responseExample: `{
  "success": true,
  "media": [
    {
      "id": "media-123456789",
      "eventId": "event-123456789",
      "url": "https://cdn.snapify.com/media/media-123456789.jpg",
      "thumbnailUrl": "https://cdn.snapify.com/media/media-123456789-thumb.jpg",
      "type": "image",
      "caption": "Party photo",
      "uploaderName": "John Doe",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}`,
        parameters: [
          { name: 'eventId', type: 'string', required: true, description: 'Event ID in path' }
        ]
      }
    ],
    users: [
      {
        title: 'Get All Users',
        method: 'GET',
        endpoint: '/api/users',
        description: 'Retrieve a list of all users (admin only).',
        requestExample: `const response = await fetch('https://api.snapify.com/v1/api/users', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});`,
        responseExample: `{
  "success": true,
  "users": [
    {
      "id": "user-123456789",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}`,
        parameters: []
      },
      {
        title: 'Get User by ID',
        method: 'GET',
        endpoint: '/api/users/{userId}',
        description: 'Retrieve detailed information about a specific user.',
        requestExample: `const response = await fetch('https://api.snapify.com/v1/api/users/user-123456789', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});`,
        responseExample: `{
  "success": true,
  "user": {
    "id": "user-123456789",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}`,
        parameters: [
          { name: 'userId', type: 'string', required: true, description: 'User ID in path' }
        ]
      }
    ]
  }

  const sections = [
    { id: 'authentication', label: 'Authentication' },
    { id: 'events', label: 'Event Management' },
    { id: 'media', label: 'Media Management' },
    { id: 'users', label: 'User Management' }
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">API Reference</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Comprehensive API documentation for all Snapify endpoints with interactive examples.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            to="/interactive-api"
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            <FaLightbulb className="inline mr-1" /> Try Interactive API
          </Link>
          <Link
            to="/search"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <FaSearch className="inline mr-1" /> Search API
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">API Sections</h2>

        <div className="flex flex-wrap gap-2 mb-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-md transition-colors ${activeSection === section.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {sections.find(s => s.id === activeSection)?.label}
        </h2>

        <div className="space-y-4">
          {apiEndpoints[activeSection as keyof typeof apiEndpoints].map((endpoint, index) => (
            <ApiEndpointCard key={index} {...endpoint} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Code Examples</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">JavaScript Example</h3>
            <CodeBlock
              language="javascript"
              code={`const API_URL = 'https://api.snapify.com/v1';
const token = 'your_jwt_token';

async function getUserEvents() {
  const response = await fetch(\`\${API_URL}/api/events\`, {
    headers: {
      'Authorization': \`Bearer \${token}\`
    }
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }

  return await response.json();
}

// Usage
getUserEvents()
  .then(events => console.log('User events:', events))
  .catch(error => console.error('Error:', error));`}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Python Example</h3>
            <CodeBlock
              language="python"
              code={`import requests

API_URL = "https://api.snapify.com/v1"
TOKEN = "your_jwt_token"

def get_user_events():
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }

    response = requests.get(f"{API_URL}/api/events", headers=headers)

    if response.status_code != 200:
        raise Exception(f"API request failed: {response.status_code}")

    return response.json()

# Usage
try:
    events = get_user_events()
    print("User events:", events)
except Exception as e:
    print("Error:", str(e))`}
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">WebSocket API</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Snapify provides real-time WebSocket connectivity for event updates and notifications.
        </p>

        <CodeBlock
          language="javascript"
          code={`const socket = io('wss://api.snapify.com', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Authentication
socket.emit('authenticate', 'your_jwt_token');

// Join an event room
socket.emit('join_event', 'event-123456789');

// Event handling
socket.on('media_uploaded', (mediaItem) => {
  console.log('New media uploaded:', mediaItem);
});

socket.on('new_like', (data) => {
  console.log('Media liked:', data);
});`}
        />

        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Real-time Events</h3>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
            <li><strong>Media Events:</strong> media_uploaded, media_processed, new_like, new_comment</li>
            <li><strong>Guestbook Events:</strong> new_message, guestbook_updated</li>
            <li><strong>System Events:</strong> user_updated, admin_status_update, force_client_reload</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Best Practices</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Authentication</h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
              <li>Always use HTTPS for API requests</li>
              <li>Store JWT tokens securely (HttpOnly cookies recommended)</li>
              <li>Implement token refresh mechanism</li>
              <li>Handle token expiration gracefully</li>
            </ul>
          </div>

          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Error Handling</h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
              <li>Implement comprehensive error handling</li>
              <li>Handle rate limit responses (429 status)</li>
              <li>Validate all API responses</li>
              <li>Implement retry logic with exponential backoff</li>
            </ul>
          </div>

          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Performance</h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
              <li>Use pagination for large datasets</li>
              <li>Implement client-side caching</li>
              <li>Use WebSocket for real-time updates</li>
              <li>Optimize image uploads and processing</li>
            </ul>
          </div>

          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Security</h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
              <li>Validate all user inputs</li>
              <li>Implement proper CORS policies</li>
              <li>Use secure token storage</li>
              <li>Respect API rate limits</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ApiReference