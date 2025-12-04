import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaSearch, FaBook, FaCode, FaCogs, FaRocket } from 'react-icons/fa'
import { useDocumentation } from '../context/DocumentationContext'
import { useTheme } from '../context/ThemeContext'

const SearchResults = () => {
    const { isDarkMode } = useTheme()
    const { searchResults, searchQuery, searchDocumentation } = useDocumentation()
    const [searchParams] = useSearchParams()
    const [localSearchQuery, setLocalSearchQuery] = useState('')

    useEffect(() => {
        const query = searchParams.get('q') || ''
        setLocalSearchQuery(query)
        if (query) {
            searchDocumentation(query)
        }
    }, [searchParams, searchDocumentation])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (localSearchQuery.trim()) {
            searchDocumentation(localSearchQuery)
        }
    }

    const getIconForCategory = (category: string) => {
        switch (category) {
            case 'api': return <FaCode className="text-blue-500 mr-2" />
            case 'architecture': return <FaCogs className="text-purple-500 mr-2" />
            case 'guides': return <FaRocket className="text-orange-500 mr-2" />
            default: return <FaBook className="text-green-500 mr-2" />
        }
    }

    return (
        <div className="max-w-6xl mx-auto">
            <section className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Search Results</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {searchResults.length > 0
                        ? `Found ${searchResults.length} results for "${searchQuery}"`
                        : `No results found for "${searchQuery}"`}
                </p>

                <form onSubmit={handleSearch} className="mb-6">
                    <div className="flex">
                        <input
                            type="text"
                            placeholder="Search documentation..."
                            value={localSearchQuery}
                            onChange={(e) => setLocalSearchQuery(e.target.value)}
                            className={`flex-grow px-4 py-2 rounded-l-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                                ? 'bg-gray-800 border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                                }`}
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 transition-colors"
                        >
                            <FaSearch className="inline mr-1" /> Search
                        </button>
                    </div>
                </form>
            </section>

            {searchResults.length > 0 ? (
                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Results</h2>

                    <div className="space-y-4">
                        {searchResults.map((result, index) => (
                            <div key={index} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow`}>
                                <div className="flex justify-between items-start mb-2">
                                    <Link
                                        to={result.path}
                                        className="text-lg font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                                    >
                                        {getIconForCategory(result.category)}
                                        {result.title}
                                    </Link>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${result.category === 'api' ? 'bg-blue-100 text-blue-800' :
                                        result.category === 'architecture' ? 'bg-purple-100 text-purple-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                        {result.category}
                                    </span>
                                </div>

                                <p className="text-gray-600 dark:text-gray-300 mb-3">{result.content.substring(0, 150)}...</p>

                                <div className="flex flex-wrap gap-2">
                                    {result.tags.map((tag, tagIndex) => (
                                        <span key={tagIndex} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : (
                <section className="text-center py-12">
                    <div className="mb-6">
                        <FaSearch className="text-6xl text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No results found</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            Try adjusting your search terms or browse our documentation sections.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        <Link
                            to="/api-reference"
                            className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                        >
                            <FaCode className="text-2xl text-blue-500 mb-2" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">API Reference</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">Comprehensive API documentation</p>
                        </Link>

                        <Link
                            to="/architecture"
                            className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                        >
                            <FaCogs className="text-2xl text-purple-500 mb-2" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Architecture</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">System design and components</p>
                        </Link>

                        <Link
                            to="/developer-guides"
                            className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                        >
                            <FaRocket className="text-2xl text-orange-500 mb-2" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Developer Guides</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">Getting started and best practices</p>
                        </Link>

                        <Link
                            to="/interactive-api"
                            className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                        >
                            <FaCode className="text-2xl text-green-500 mb-2" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Interactive API</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">Test endpoints in your browser</p>
                        </Link>
                    </div>
                </section>
            )}
        </div>
    )
}

export default SearchResults