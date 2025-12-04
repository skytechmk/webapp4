import { useState } from 'react'
import { FaPlay, FaCode, FaCheck, FaTimes, FaCopy } from 'react-icons/fa'
import CodeBlock from '../components/CodeBlock'
import { useTheme } from '../context/ThemeContext'

const InteractiveApiExplorer = () => {
    const { isDarkMode } = useTheme()
    const [activeEndpoint, setActiveEndpoint] = useState('login')
    const [requestMethod, setRequestMethod] = useState('POST')
    const [requestUrl, setRequestUrl] = useState('https://api.snapify.com/v1/api/auth/login')
    const [requestHeaders, setRequestHeaders] = useState('{\n}')
    const [requestBody, setRequestBody] = useState('{\n  "email": "user@example.com",\n  "password": "securepassword123"\n}')
    const [responseData, setResponseData] = useState('')
    const [responseStatus, setResponseStatus] = useState('')
    const [responseHeaders, setResponseHeaders] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const apiEndpoints = [
        {
            id: 'login',
            name: 'User Login',
            method: 'POST',
            endpoint: '/api/auth/login',
            description: 'Authenticate user and receive JWT token',
            exampleRequest: '{\n  "email": "user@example.com",\n  "password": "securepassword123"\n}',
            exampleResponse: '{\n  "success": true,\n  "user": {\n    "id": "user-123456789",\n    "email": "user@example.com",\n    "name": "John Doe"\n  },\n  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."\n}'
        },
        {
            id: 'create-event',
            name: 'Create Event',
            method: 'POST',
            endpoint: '/api/events',
            description: 'Create a new event with custom settings',
            exampleRequest: '{\n  "title": "Summer Party",\n  "hostId": "user-123456789",\n  "date": "2023-12-25",\n  "description": "Annual summer celebration"\n}',
            exampleResponse: '{\n  "success": true,\n  "event": {\n    "id": "event-123456789",\n    "title": "Summer Party",\n    "hostId": "user-123456789"\n  }\n}'
        },
        {
            id: 'upload-media',
            name: 'Upload Media',
            method: 'POST',
            endpoint: '/api/media',
            description: 'Upload photos or videos to an event',
            exampleRequest: 'FormData with file, eventId, and metadata',
            exampleResponse: '{\n  "success": true,\n  "media": {\n    "id": "media-123456789",\n    "url": "https://cdn.snapify.com/media/media-123456789.jpg"\n  }\n}'
        },
        {
            id: 'get-events',
            name: 'Get Events',
            method: 'GET',
            endpoint: '/api/events',
            description: 'Retrieve all events for authenticated user',
            exampleRequest: 'No request body required',
            exampleResponse: '{\n  "success": true,\n  "events": [\n    {\n      "id": "event-123456789",\n      "title": "Summer Party"\n    }\n  ]\n}'
        }
    ]

    const handleEndpointChange = (endpointId: string) => {
        const endpoint = apiEndpoints.find(e => e.id === endpointId)
        if (endpoint) {
            setActiveEndpoint(endpointId)
            setRequestMethod(endpoint.method)
            setRequestUrl(`https://api.snapify.com/v1${endpoint.endpoint}`)
            setRequestHeaders(endpoint.method === 'GET' ? '' : '{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer your_jwt_token"\n}')
            setRequestBody(endpoint.exampleRequest)
            setResponseData('')
            setResponseStatus('')
            setResponseHeaders('')
            setError('')
        }
    }

    const handleSendRequest = async () => {
        try {
            setLoading(true)
            setError('')

            // In a real implementation, this would make an actual API call
            // For this demo, we'll simulate a response
            await new Promise(resolve => setTimeout(resolve, 1000))

            const endpoint = apiEndpoints.find(e => e.id === activeEndpoint)
            if (endpoint) {
                setResponseStatus('200 OK')
                setResponseHeaders('{\n  "Content-Type": "application/json",\n  "X-RateLimit-Limit": "100",\n  "X-RateLimit-Remaining": "99"\n}')
                setResponseData(endpoint.exampleResponse)
            }

            setLoading(false)
        } catch (err) {
            setError('Failed to send request. Please check your input and try again.')
            setLoading(false)
        }
    }

    const handleCopyRequest = () => {
        const requestCode = `${requestMethod} ${requestUrl}\n\nHeaders:\n${requestHeaders}\n\nBody:\n${requestBody}`
        navigator.clipboard.writeText(requestCode)
    }

    const handleCopyResponse = () => {
        navigator.clipboard.writeText(responseData)
    }

    return (
        <div className="max-w-6xl mx-auto">
            <section className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Interactive API Explorer</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Test Snapify API endpoints directly in your browser. Explore different endpoints, customize requests, and see responses in real-time.
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={handleCopyRequest}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        <FaCopy className="inline mr-1" /> Copy Request
                    </button>
                    <button
                        onClick={handleCopyResponse}
                        disabled={!responseData}
                        className={`px-4 py-2 rounded-md transition-colors ${!responseData
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        <FaCopy className="inline mr-1" /> Copy Response
                    </button>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">API Endpoints</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {apiEndpoints.map((endpoint) => (
                        <div
                            key={endpoint.id}
                            onClick={() => handleEndpointChange(endpoint.id)}
                            className={`p-4 rounded-lg cursor-pointer transition-colors border ${activeEndpoint === endpoint.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{endpoint.name}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                                        endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                    }`}>
                                    {endpoint.method}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{endpoint.endpoint}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{endpoint.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Request Builder</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Request Configuration</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
                                <select
                                    value={requestMethod}
                                    onChange={(e) => setRequestMethod(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                                        ? 'bg-gray-800 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                >
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                                <input
                                    type="text"
                                    value={requestUrl}
                                    onChange={(e) => setRequestUrl(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                                        ? 'bg-gray-800 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Headers</label>
                                <textarea
                                    value={requestHeaders}
                                    onChange={(e) => setRequestHeaders(e.target.value)}
                                    rows={4}
                                    className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${isDarkMode
                                        ? 'bg-gray-800 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
                                <textarea
                                    value={requestBody}
                                    onChange={(e) => setRequestBody(e.target.value)}
                                    rows={8}
                                    className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${isDarkMode
                                        ? 'bg-gray-800 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                />
                            </div>

                            <button
                                onClick={handleSendRequest}
                                disabled={loading}
                                className={`w-full px-4 py-3 rounded-md text-white font-medium transition-colors ${loading
                                    ? 'bg-blue-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <FaPlay className="inline mr-2" /> Send Request
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Response</h3>

                        {error && (
                            <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
                                <div className="flex items-center">
                                    <FaTimes className="text-red-500 mr-2" />
                                    <span className="text-red-700 dark:text-red-300">{error}</span>
                                </div>
                            </div>
                        )}

                        {responseStatus && (
                            <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Status: {responseStatus}</span>
                                {responseStatus.startsWith('2') && <FaCheck className="text-green-500" />}
                                {responseStatus.startsWith('4') || responseStatus.startsWith('5') ? (
                                    <FaTimes className="text-red-500" />
                                ) : null}
                            </div>
                        )}

                        {responseHeaders && (
                            <div className="mb-4">
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Headers</h4>
                                <CodeBlock language="json" code={responseHeaders} showLineNumbers={false} />
                            </div>
                        )}

                        {responseData && (
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Body</h4>
                                <CodeBlock language="json" code={responseData} />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">API Examples</h2>

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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">cURL Example</h3>
                        <CodeBlock
                            language="bash"
                            code={`# Get user events
curl -X GET "https://api.snapify.com/v1/api/events" \\
  -H "Authorization: Bearer your_jwt_token" \\
  -H "Content-Type: application/json"

# Upload media
curl -X POST "https://api.snapify.com/v1/api/media" \\
  -H "Authorization: Bearer your_jwt_token" \\
  -F "file=@/path/to/photo.jpg" \\
  -F "eventId=event-123456789" \\
  -F "metadata={\\\\"caption\\\":\\\"Party photo\\\",\\\"uploaderName\\\":\\\"John Doe\\\"}"`}
                        />
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Best Practices</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Authentication</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Always use HTTPS for API requests</li>
                            <li>Store JWT tokens securely (HttpOnly cookies)</li>
                            <li>Implement token refresh mechanism</li>
                            <li>Handle token expiration gracefully</li>
                        </ul>
                    </div>

                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Error Handling</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Implement comprehensive error handling</li>
                            <li>Handle rate limit responses (429 status)</li>
                            <li>Validate all API responses</li>
                            <li>Implement retry logic with exponential backoff</li>
                        </ul>
                    </div>

                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Performance</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Use pagination for large datasets</li>
                            <li>Implement client-side caching</li>
                            <li>Use WebSocket for real-time updates</li>
                            <li>Optimize image uploads and processing</li>
                        </ul>
                    </div>

                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
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

export default InteractiveApiExplorer