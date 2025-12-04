import { Link } from 'react-router-dom'
import { FaExclamationTriangle, FaHome, FaSearch, FaBook } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'

const NotFound = () => {
    const { isDarkMode } = useTheme()

    return (
        <div className="max-w-4xl mx-auto text-center py-16">
            <div className="mb-8">
                <FaExclamationTriangle className="text-6xl text-yellow-500 mx-auto mb-4" />
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404 - Page Not Found</h1>
                <p className="text-xl text-gray-600 dark:text-gray-300">
                    The page you're looking for doesn't exist or has been moved.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Link
                    to="/"
                    className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                >
                    <FaHome className="text-3xl text-blue-500 mb-3 mx-auto" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Home</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Return to documentation home</p>
                </Link>

                <Link
                    to="/api-reference"
                    className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                >
                    <FaBook className="text-3xl text-green-500 mb-3 mx-auto" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">API Reference</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Browse API documentation</p>
                </Link>

                <Link
                    to="/search"
                    className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                >
                    <FaSearch className="text-3xl text-purple-500 mb-3 mx-auto" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Search</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Search documentation</p>
                </Link>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Popular Sections</h2>
                <div className="flex justify-center space-x-4">
                    <Link
                        to="/api-reference"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                        API Reference
                    </Link>
                    <Link
                        to="/architecture"
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    >
                        Architecture
                    </Link>
                    <Link
                        to="/developer-guides"
                        className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                    >
                        Developer Guides
                    </Link>
                </div>
            </div>

            <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    If you believe this is an error, please contact our support team.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                    <FaHome className="mr-2" /> Return to Home
                </Link>
            </div>
        </div>
    )
}

export default NotFound