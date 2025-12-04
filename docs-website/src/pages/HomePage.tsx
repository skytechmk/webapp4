import { Link } from 'react-router-dom'
import { FaBook, FaCode, FaCogs, FaRocket, FaSearch, FaLightbulb, FaChevronRight } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'

const HomePage = () => {
    const { isDarkMode } = useTheme()

    const featureCards = [
        {
            icon: <FaBook className="text-3xl text-blue-500 mb-4" />,
            title: 'Comprehensive Documentation',
            description: 'Complete API reference, architecture guides, and developer resources for Snapify.',
            link: '/api-reference',
            linkText: 'Explore API Reference'
        },
        {
            icon: <FaCode className="text-3xl text-green-500 mb-4" />,
            title: 'Interactive API Explorer',
            description: 'Test API endpoints directly in your browser with our interactive explorer.',
            link: '/interactive-api',
            linkText: 'Try API Explorer'
        },
        {
            icon: <FaCogs className="text-3xl text-purple-500 mb-4" />,
            title: 'System Architecture',
            description: 'Detailed architecture diagrams and system design documentation.',
            link: '/architecture',
            linkText: 'View Architecture'
        },
        {
            icon: <FaRocket className="text-3xl text-orange-500 mb-4" />,
            title: 'Developer Guides',
            description: 'Getting started guides, setup instructions, and best practices.',
            link: '/developer-guides',
            linkText: 'Read Guides'
        }
    ]

    return (
        <div className="max-w-6xl mx-auto">
            <section className="text-center py-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                    Welcome to Snapify Documentation
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
                    Comprehensive documentation for the Snapify real-time event sharing platform.
                    Explore our API reference, architecture guides, and developer resources.
                </p>

                <div className="flex justify-center space-x-4 mb-12">
                    <Link
                        to="/api-reference"
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                        <FaCode className="inline mr-2" /> API Reference
                    </Link>
                    <Link
                        to="/interactive-api"
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                        <FaLightbulb className="inline mr-2" /> Interactive API
                    </Link>
                </div>
            </section>

            <section className="py-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                    Quick Start Guide
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Get API Key</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Sign up for a developer account and get your API key from the dashboard.
                        </p>
                        <button className="text-blue-500 hover:underline">Get API Key</button>
                    </div>

                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. Make API Requests</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Start making requests to our RESTful API endpoints with proper authentication.
                        </p>
                        <button className="text-blue-500 hover:underline">View API Reference</button>
                    </div>

                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Integrate SDK</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Use our JavaScript SDK for easier integration with your application.
                        </p>
                        <button className="text-blue-500 hover:underline">View SDK Docs</button>
                    </div>
                </div>
            </section>

            <section className="py-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                    Documentation Features
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featureCards.map((card, index) => (
                        <div key={index} className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow`}>
                            {card.icon}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{card.title}</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">{card.description}</p>
                            <Link
                                to={card.link}
                                className="inline-flex items-center text-blue-500 hover:text-blue-600 font-medium"
                            >
                                {card.linkText} <FaChevronRight className="ml-1" />
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <section className="py-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                    Popular API Endpoints
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Authentication</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">POST /api/auth/login</p>
                            </div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">POST</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Authenticate users and get JWT tokens for API access.
                        </p>
                        <Link to="/api-reference#authentication" className="text-blue-500 hover:underline">View Details</Link>
                    </div>

                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Creation</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">POST /api/events</p>
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">POST</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Create new events with custom settings and access controls.
                        </p>
                        <Link to="/api-reference#event-management" className="text-blue-500 hover:underline">View Details</Link>
                    </div>

                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Media Upload</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">POST /api/media</p>
                            </div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">POST</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Upload photos and videos to events with metadata.
                        </p>
                        <Link to="/api-reference#media-management" className="text-blue-500 hover:underline">View Details</Link>
                    </div>

                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time Updates</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">WebSocket API</p>
                            </div>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">WS</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Receive real-time updates via WebSocket connections.
                        </p>
                        <Link to="/api-reference#websocket-api" className="text-blue-500 hover:underline">View Details</Link>
                    </div>
                </div>
            </section>

            <section className="py-12 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Ready to get started?
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
                    Explore our comprehensive documentation or try out the interactive API explorer.
                </p>

                <div className="flex justify-center space-x-4">
                    <Link
                        to="/api-reference"
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                        <FaBook className="inline mr-2" /> View Documentation
                    </Link>
                    <Link
                        to="/interactive-api"
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                        <FaLightbulb className="inline mr-2" /> Try Interactive API
                    </Link>
                </div>
            </section>
        </div>
    )
}

export default HomePage