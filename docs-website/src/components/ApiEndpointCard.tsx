import { useState } from 'react'
import { FaChevronDown, FaChevronUp, FaPlay, FaCode, FaCopy } from 'react-icons/fa'
import CodeBlock from './CodeBlock'

interface ApiEndpointCardProps {
    title: string
    method: string
    endpoint: string
    description: string
    requestExample?: string
    responseExample?: string
    parameters?: Array<{
        name: string
        type: string
        required: boolean
        description: string
    }>
}

const ApiEndpointCard: React.FC<ApiEndpointCardProps> = ({
    title,
    method,
    endpoint,
    description,
    requestExample,
    responseExample,
    parameters = []
}) => {
    const [expanded, setExpanded] = useState(false)
    const [activeTab, setActiveTab] = useState<'request' | 'response'>('request')

    const getMethodColor = () => {
        switch (method.toUpperCase()) {
            case 'GET': return 'bg-green-500'
            case 'POST': return 'bg-blue-500'
            case 'PUT': return 'bg-yellow-500'
            case 'DELETE': return 'bg-red-500'
            default: return 'bg-gray-500'
        }
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getMethodColor()}`}>
                        {method}
                    </span>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{endpoint}</p>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {expanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>
            </div>

            {expanded && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>

                    {parameters.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Parameters</h4>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Required</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {parameters.map((param, index) => (
                                            <tr key={index}>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{param.name}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{param.type}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                    {param.required ? (
                                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Required</span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">Optional</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{param.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {(requestExample || responseExample) && (
                        <div className="mb-4">
                            <div className="flex space-x-2 mb-2">
                                {requestExample && (
                                    <button
                                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'request'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            }`}
                                        onClick={() => setActiveTab('request')}
                                    >
                                        <FaCode className="inline mr-1" /> Request
                                    </button>
                                )}
                                {responseExample && (
                                    <button
                                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'response'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            }`}
                                        onClick={() => setActiveTab('response')}
                                    >
                                        <FaCode className="inline mr-1" /> Response
                                    </button>
                                )}
                            </div>

                            {activeTab === 'request' && requestExample && (
                                <CodeBlock language="javascript" code={requestExample} />
                            )}
                            {activeTab === 'response' && responseExample && (
                                <CodeBlock language="json" code={responseExample} />
                            )}
                        </div>
                    )}

                    <div className="flex justify-end space-x-2">
                        <button className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <FaPlay className="inline mr-1" /> Try it out
                        </button>
                        <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors">
                            <FaCopy className="inline mr-1" /> Copy example
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ApiEndpointCard