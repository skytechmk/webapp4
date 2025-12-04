import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useDocumentation } from '../context/DocumentationContext'
import { FaMoon, FaSun, FaSearch, FaBars, FaTimes, FaBook, FaCode, FaCogs, FaRocket } from 'react-icons/fa'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isDarkMode, setTheme } = useTheme()
    const { setSearchQuery, searchDocumentation, versions, currentVersion, setCurrentVersion } = useDocumentation()
    const [searchInput, setSearchInput] = useState('')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const location = useLocation()

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setSearchQuery(searchInput)
        searchDocumentation(searchInput)
    }

    const toggleTheme = () => {
        setTheme(isDarkMode ? 'light' : 'dark')
    }

    const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentVersion(e.target.value)
    }

    const navItems = [
        { path: '/', label: 'Home', icon: <FaBook /> },
        { path: '/api-reference', label: 'API Reference', icon: <FaCode /> },
        { path: '/architecture', label: 'Architecture', icon: <FaCogs /> },
        { path: '/developer-guides', label: 'Developer Guides', icon: <FaRocket /> },
        { path: '/interactive-api', label: 'Interactive API', icon: <FaCode /> }
    ]

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
            {/* Header */}
            <header className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <button
                            className="md:hidden p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
                        </button>
                        <Link to="/" className="flex items-center space-x-2">
                            <FaBook className="text-2xl text-blue-500" />
                            <span className="text-xl font-bold">Snapify Docs</span>
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${location.pathname === item.path
                                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                                    : 'text-gray-600 dark:text-gray-300'
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:block">
                            <select
                                value={currentVersion}
                                onChange={handleVersionChange}
                                className={`px-3 py-1 rounded-md border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                {versions.map((version) => (
                                    <option key={version} value={version}>
                                        v{version}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {isDarkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-600" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="container mx-auto px-4 py-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-md mb-2 ${location.pathname === item.path
                                        ? 'bg-blue-500 text-white dark:bg-blue-600'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                            <div className="mt-4">
                                <select
                                    value={currentVersion}
                                    onChange={handleVersionChange}
                                    className={`w-full px-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                >
                                    {versions.map((version) => (
                                        <option key={version} value={version}>
                                            v{version}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Search Bar */}
            <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="container mx-auto px-4 py-3">
                    <form onSubmit={handleSearch} className="flex items-center space-x-2">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                placeholder="Search documentation..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className={`w-full px-4 py-2 pl-10 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                                    ? 'bg-gray-800 border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                            />
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 flex-grow">
                {children}
            </main>

            {/* Footer */}
            <footer className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} mt-16 py-8`}>
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Snapify Documentation</h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                Comprehensive documentation for the Snapify real-time event sharing platform.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                            <ul className="space-y-2">
                                <li><Link to="/" className="text-blue-500 hover:underline">Home</Link></li>
                                <li><Link to="/api-reference" className="text-blue-500 hover:underline">API Reference</Link></li>
                                <li><Link to="/architecture" className="text-blue-500 hover:underline">Architecture</Link></li>
                                <li><Link to="/developer-guides" className="text-blue-500 hover:underline">Developer Guides</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Resources</h3>
                            <ul className="space-y-2">
                                <li><a href="https://github.com/your-org/snapify" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                                <li><a href="https://snapify.com" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Website</a></li>
                                <li><a href="https://status.snapify.com" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Status</a></li>
                                <li><a href="https://community.snapify.com" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Community</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-4 text-center text-gray-500 dark:text-gray-400">
                        <p>© {new Date().getFullYear()} Snapify. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Layout