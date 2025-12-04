import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { FaCopy, FaCheck } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'

interface CodeBlockProps {
    language: string
    code: string
    showLineNumbers?: boolean
    className?: string
}

const CodeBlock: React.FC<CodeBlockProps> = ({
    language,
    code,
    showLineNumbers = true,
    className = ''
}) => {
    const { isDarkMode } = useTheme()
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className={`relative ${className}`}>
            <div className="flex justify-between items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-md">
                <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                    {language}
                </span>
                <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Copy code"
                >
                    {copied ? (
                        <FaCheck className="text-green-500" />
                    ) : (
                        <FaCopy className="text-gray-600 dark:text-gray-300" />
                    )}
                </button>
            </div>
            <SyntaxHighlighter
                language={language}
                style={isDarkMode ? vscDarkPlus : atomDark}
                showLineNumbers={showLineNumbers}
                customStyle={{
                    margin: 0,
                    borderRadius: '0 0 0.375rem 0.375rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.5'
                }}
                wrapLines={true}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    )
}

export default CodeBlock