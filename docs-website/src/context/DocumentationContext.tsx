import React, { createContext, useContext, useState, useEffect } from 'react'
import Fuse from 'fuse.js'
import { loadMarkdownDocumentation } from '../utils/documentationLoader'

interface DocumentationItem {
    id: string
    title: string
    content: string
    category: string
    version: string
    tags: string[]
    path: string
}

interface DocumentationContextType {
    documentation: DocumentationItem[]
    searchResults: DocumentationItem[]
    versions: string[]
    currentVersion: string
    searchQuery: string
    loading: boolean
    setCurrentVersion: (version: string) => void
    setSearchQuery: (query: string) => void
    searchDocumentation: (query: string) => void
    getDocumentationById: (id: string) => DocumentationItem | undefined
}

const DocumentationContext = createContext<DocumentationContextType | undefined>(undefined)

export const DocumentationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [documentation, setDocumentation] = useState<DocumentationItem[]>([])
    const [searchResults, setSearchResults] = useState<DocumentationItem[]>([])
    const [versions] = useState<string[]>(['v1.0', 'v1.1'])
    const [currentVersion, setCurrentVersion] = useState<string>('v1.0')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(true)

    // Load documentation from existing markdown files
    useEffect(() => {
        const loadDocumentation = async () => {
            try {
                setLoading(true)

                // Load actual documentation from markdown files
                const loadedDocumentation = loadMarkdownDocumentation()

                if (loadedDocumentation.length > 0) {
                    setDocumentation(loadedDocumentation)
                } else {
                    // Fallback to mock data if loading fails
                    const mockDocumentation: DocumentationItem[] = [
                        {
                            id: 'api-reference',
                            title: 'API Reference',
                            content: 'Comprehensive API documentation...',
                            category: 'api',
                            version: 'v1.0',
                            tags: ['api', 'reference', 'endpoints'],
                            path: '/api-reference'
                        },
                        {
                            id: 'architecture',
                            title: 'System Architecture',
                            content: 'Detailed architecture documentation...',
                            category: 'architecture',
                            version: 'v1.0',
                            tags: ['architecture', 'system', 'design'],
                            path: '/architecture'
                        },
                        {
                            id: 'developer-guides',
                            title: 'Developer Guides',
                            content: 'Getting started and development guides...',
                            category: 'guides',
                            version: 'v1.0',
                            tags: ['developer', 'guides', 'onboarding'],
                            path: '/developer-guides'
                        }
                    ]
                    setDocumentation(mockDocumentation)
                }

                setLoading(false)
            } catch (error) {
                console.error('Failed to load documentation:', error)
                setLoading(false)
            }
        }

        loadDocumentation()
    }, [])

    // Search functionality using Fuse.js
    const searchDocumentation = (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }

        const fuse = new Fuse(documentation, {
            keys: ['title', 'content', 'tags'],
            includeScore: true,
            threshold: 0.4,
            ignoreLocation: true
        })

        const results = fuse.search(query).map(result => result.item)
        setSearchResults(results)
    }

    const getDocumentationById = (id: string) => {
        return documentation.find(item => item.id === id)
    }

    return (
        <DocumentationContext.Provider value={{
            documentation,
            searchResults,
            versions,
            currentVersion,
            searchQuery,
            loading,
            setCurrentVersion,
            setSearchQuery,
            searchDocumentation,
            getDocumentationById
        }}>
            {children}
        </DocumentationContext.Provider>
    )
}

export const useDocumentation = () => {
    const context = useContext(DocumentationContext)
    if (!context) {
        throw new Error('useDocumentation must be used within a DocumentationProvider')
    }
    return context
}