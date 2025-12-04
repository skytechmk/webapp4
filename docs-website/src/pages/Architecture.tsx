import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaCogs, FaCode, FaDatabase, FaNetworkWired, FaServer } from 'react-icons/fa'
import CodeBlock from '../components/CodeBlock'
import { useTheme } from '../context/ThemeContext'

const Architecture = () => {
    const { isDarkMode } = useTheme()
    const [activeTab, setActiveTab] = useState('overview')

    const architectureTabs = [
        { id: 'overview', label: 'System Overview' },
        { id: 'frontend', label: 'Frontend Architecture' },
        { id: 'backend', label: 'Backend Architecture' },
        { id: 'data-flow', label: 'Data Flow' },
        { id: 'performance', label: 'Performance' },
        { id: 'security', label: 'Security' }
    ]

    return (
        <div className="max-w-6xl mx-auto">
            <section className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">System Architecture</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Comprehensive technical architecture overview of Snapify, covering system design, component architecture, data flow, and technology stack.
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                    {architectureTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-md transition-colors ${activeTab === tab.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </section>

            {activeTab === 'overview' && (
                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">System Overview</h2>

                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700 mb-6`}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">High-Level Architecture</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Snapify is a real-time event sharing platform with a microservices architecture, supporting multiple user roles and advanced features.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center">
                                <FaServer className="text-blue-500 mr-2" />
                                <span>API Gateway</span>
                            </div>
                            <div className="flex items-center">
                                <FaCode className="text-green-500 mr-2" />
                                <span>Microservices</span>
                            </div>
                            <div className="flex items-center">
                                <FaDatabase className="text-purple-500 mr-2" />
                                <span>Data Storage</span>
                            </div>
                            <div className="flex items-center">
                                <FaNetworkWired className="text-orange-500 mr-2" />
                                <span>Real-time Infrastructure</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Core Components</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Client Applications (React PWA)</li>
                                <li>API Gateway (Express.js)</li>
                                <li>Microservices (Authentication, User, Event, Media, Notification)</li>
                                <li>Data Storage (SQLite, Redis, S3-compatible)</li>
                                <li>Real-time Infrastructure (WebSocket with Redis)</li>
                                <li>Monitoring & Analytics</li>
                            </ul>
                        </div>

                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Key Features</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Real-time event sharing</li>
                                <li>AI-powered captioning and watermarking</li>
                                <li>Multi-user collaboration</li>
                                <li>Tiered pricing and access control</li>
                                <li>Live slideshows and guestbooks</li>
                                <li>Comprehensive analytics</li>
                            </ul>
                        </div>
                    </div>
                </section>
            )}

            {activeTab === 'frontend' && (
                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Frontend Architecture</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Technology Stack</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>React 19.2.0 with TypeScript</li>
                                <li>State Management: React hooks + Context API + Zustand</li>
                                <li>Styling: Tailwind CSS 4.1.17</li>
                                <li>Routing: View-based navigation system</li>
                                <li>PWA: Progressive Web App with service workers</li>
                                <li>Build Tool: Vite 5.4.0</li>
                            </ul>
                        </div>

                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Component Structure</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>App.tsx: Core application component</li>
                                <li>AuthManager: Authentication handling</li>
                                <li>EventManager: Event management</li>
                                <li>MediaManager: Media upload and processing</li>
                                <li>RealTimeManager: WebSocket connectivity</li>
                                <li>Lazy-loaded components for performance</li>
                            </ul>
                        </div>
                    </div>

                    <CodeBlock
                        language="javascript"
                        code={`// Example React component structure
import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEvent } from '../context/EventContext'

const EventDashboard = () => {
  const { user } = useAuth()
  const { events, loading, error } = useEvent()

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay message={error} />

  return (
    <div className="event-dashboard">
      <h1>Welcome, {user.name}</h1>
      <EventList events={events} />
      <MediaGallery />
    </div>
  )
}

export default EventDashboard`}
                    />
                </section>
            )}

            {activeTab === 'backend' && (
                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Backend Architecture</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Microservices</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li><strong>Authentication Service:</strong> JWT token management, Google OAuth</li>
                                <li><strong>User Service:</strong> CRUD operations, role-based access control</li>
                                <li><strong>Event Service:</strong> Event creation/management, access control</li>
                                <li><strong>Media Service:</strong> Upload/processing, storage management</li>
                                <li><strong>Notification Service:</strong> Real-time notifications, email/push</li>
                            </ul>
                        </div>

                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Technology Stack</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Node.js with TypeScript</li>
                                <li>Express.js 5.1.0</li>
                                <li>SQLite 5.1.7 (PostgreSQL migration planned)</li>
                                <li>Redis 5.10.0 for caching</li>
                                <li>Socket.IO 4.8.1 with Redis adapter</li>
                                <li>JWT authentication</li>
                            </ul>
                        </div>
                    </div>

                    <CodeBlock
                        language="javascript"
                        code={`// Example Express.js API endpoint
import express from 'express'
import { authenticate } from '../middleware/auth'
import { validateEvent } from '../middleware/validation'
import { EventService } from '../services/eventService'

const router = express.Router()

// Create new event
router.post('/', authenticate, validateEvent, async (req, res) => {
  try {
    const event = await EventService.createEvent({
      ...req.body,
      hostId: req.user.id
    })

    res.status(201).json({
      success: true,
      event
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

export default router`}
                    />
                </section>
            )}

            {activeTab === 'data-flow' && (
                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Data Flow Architecture</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Authentication Flow</h3>
                            <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Client sends login request</li>
                                <li>API Gateway forwards to Auth Service</li>
                                <li>Auth Service validates credentials</li>
                                <li>JWT token is generated and returned</li>
                                <li>Client stores token securely</li>
                                <li>Subsequent requests include token</li>
                            </ol>
                        </div>

                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Media Upload Flow</h3>
                            <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Client uploads media file</li>
                                <li>API Gateway forwards to Media Service</li>
                                <li>Original file stored in S3</li>
                                <li>Media processing (resize, watermark)</li>
                                <li>Processed file stored in S3</li>
                                <li>CDN caching for delivery</li>
                                <li>Real-time update via WebSocket</li>
                            </ol>
                        </div>
                    </div>

                    <CodeBlock
                        language="mermaid"
                        code={`sequenceDiagram
    participant Client
    participant API_Gateway
    participant Media_Service
    participant Storage
    participant CDN

    Client->>API_Gateway: POST /media (with file)
    API_Gateway->>Media_Service: Forward upload
    Media_Service->>Storage: Store original
    Media_Service->>Media_Service: Process (resize, watermark)
    Media_Service->>Storage: Store processed
    Media_Service->>CDN: Cache for delivery
    Media_Service-->>API_Gateway: Upload confirmation
    API_Gateway-->>Client: Success response
    Media_Service->>Client: Real-time update (WebSocket)`}
                    />
                </section>
            )}

            {activeTab === 'performance' && (
                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Performance Architecture</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Frontend Optimization</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Code splitting with React.lazy</li>
                                <li>Image optimization and lazy loading</li>
                                <li>Virtualized lists for large datasets</li>
                                <li>Service worker caching</li>
                                <li>Progressive image loading</li>
                            </ul>
                        </div>

                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Backend Optimization</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Redis caching with intelligent invalidation</li>
                                <li>Database query optimization</li>
                                <li>Connection pooling</li>
                                <li>Batch processing for media operations</li>
                                <li>Background job queues</li>
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Real-time Optimization</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>WebSocket message batching</li>
                                <li>Connection throttling</li>
                                <li>Adaptive compression</li>
                                <li>Presence management</li>
                                <li>Load-based scaling</li>
                            </ul>
                        </div>

                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Performance Metrics</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Target: {"<"} 200ms API response time (90th percentile)</li>
                                <li>Target: {"<"} 1s page load time</li>
                                <li>Target: 99.9% uptime</li>
                                <li>Target: Handle 10x current load</li>
                            </ul>
                        </div>
                    </div>
                </section>
            )}

            {activeTab === 'security' && (
                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Security Architecture</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Authentication & Authorization</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>JWT token-based authentication</li>
                                <li>OAuth 2.0 with Google integration</li>
                                <li>Role-Based Access Control (RBAC)</li>
                                <li>Resource-level permissions</li>
                                <li>Event access control (PIN protection)</li>
                            </ul>
                        </div>

                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data Protection</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>TLS 1.2+ for all communications</li>
                                <li>Encryption at rest for sensitive data</li>
                                <li>Secure password hashing (bcrypt)</li>
                                <li>JWT token signing</li>
                                <li>Input validation and sanitization</li>
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Network Security</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Firewall protection</li>
                                <li>DDoS mitigation</li>
                                <li>Rate limiting</li>
                                <li>IP filtering</li>
                                <li>CORS policies</li>
                            </ul>
                        </div>

                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Monitoring & Compliance</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Comprehensive audit logging</li>
                                <li>Anomaly detection</li>
                                <li>Security event monitoring</li>
                                <li>Regular security audits</li>
                                <li>Incident response procedures</li>
                            </ul>
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}

export default Architecture