// Browser-compatible documentation loader
// Uses mock data instead of filesystem access for browser environment

interface DocumentationItem {
    id: string
    title: string
    content: string
    category: string
    version: string
    tags: string[]
    path: string
    excerpt?: string
}

interface DocumentationSection {
    title: string
    content: string
    level: number
}

export const loadMarkdownDocumentation = (): DocumentationItem[] => {
    try {
        // Browser-compatible mock data since we can't access filesystem
        const documentation: DocumentationItem[] = [
            {
                id: 'api-reference',
                title: 'API Reference',
                content: 'Comprehensive API documentation for Snapify...',
                category: 'api',
                version: 'v1.0',
                tags: ['api', 'reference', 'endpoints'],
                path: '/api-reference',
                excerpt: 'Comprehensive API documentation for Snapify...'
            },
            {
                id: 'architecture',
                title: 'System Architecture',
                content: 'Detailed architecture documentation for Snapify...',
                category: 'architecture',
                version: 'v1.0',
                tags: ['architecture', 'system', 'design'],
                path: '/architecture',
                excerpt: 'Detailed architecture documentation for Snapify...'
            },
            {
                id: 'developer-guides',
                title: 'Developer Guides',
                content: 'Getting started and development guides for Snapify...',
                category: 'guides',
                version: 'v1.0',
                tags: ['developer', 'guides', 'onboarding'],
                path: '/developer-guides',
                excerpt: 'Getting started and development guides for Snapify...'
            }
        ]

        return documentation
    } catch (error) {
        console.error('Failed to load documentation:', error)
        return []
    }
}

export const parseMarkdownContent = (content: string): DocumentationSection[] => {
    const lines = content.split('\n')
    const sections: DocumentationSection[] = []
    let currentSection: DocumentationSection | null = null

    lines.forEach((line) => {
        if (line.startsWith('# ')) {
            // Level 1 heading
            if (currentSection) {
                sections.push(currentSection)
            }
            currentSection = {
                title: line.substring(2).trim(),
                content: '',
                level: 1
            }
        } else if (line.startsWith('## ')) {
            // Level 2 heading
            if (currentSection) {
                sections.push(currentSection)
            }
            currentSection = {
                title: line.substring(3).trim(),
                content: '',
                level: 2
            }
        } else if (line.startsWith('### ')) {
            // Level 3 heading
            if (currentSection) {
                sections.push(currentSection)
            }
            currentSection = {
                title: line.substring(4).trim(),
                content: '',
                level: 3
            }
        } else if (currentSection) {
            currentSection.content += line + '\n'
        }
    })

    if (currentSection) {
        sections.push(currentSection)
    }

    return sections
}

export const extractCodeExamples = (content: string): Array<{ language: string; code: string }> => {
    const codeBlockRegex = /```(\w+)\n([\s\S]+?)```/g
    const examples: Array<{ language: string; code: string }> = []
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
        examples.push({
            language: match[1],
            code: match[2].trim()
        })
    }

    return examples
}