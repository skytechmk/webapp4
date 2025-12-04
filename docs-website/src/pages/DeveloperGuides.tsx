import { Link } from 'react-router-dom'
import { FaCode, FaCogs, FaRocket, FaTools, FaChartBar } from 'react-icons/fa'
import CodeBlock from '../components/CodeBlock'
import { useTheme } from '../context/ThemeContext'

const DeveloperGuides = () => {
    const { isDarkMode } = useTheme()

    const guideSections = [
        {
            title: 'Getting Started',
            icon: <FaRocket className="text-2xl text-blue-500 mb-4" />,
            content: (
                <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Start</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Get started with Snapify development in just a few steps:
                    </p>

                    <CodeBlock
                        language="bash"
                        code={`# Clone the repository
git clone https://github.com/your-org/snapify.git
cd snapify

# Install dependencies
npm install

# Start development server
npm run dev`}
                    />

                    <div className="mt-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Prerequisites</h4>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Node.js 20+</li>
                            <li>npm 10+</li>
                            <li>Git 2.30+</li>
                            <li>Redis 5.10+ (optional but recommended)</li>
                        </ul>
                    </div>
                </>
            )
        },
        {
            title: 'Development Workflow',
            icon: <FaCode className="text-2xl text-green-500 mb-4" />,
            content: (
                <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Git Workflow</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        We use a feature branch workflow with protected main and develop branches.
                    </p>

                    <CodeBlock
                        language="bash"
                        code={`# Create new feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat(api): add new endpoint for user preferences"

# Push to remote
git push origin feature/your-feature-name

# Create pull request
gh pr create --base develop --title "Add user preferences API"`}
                    />

                    <div className="mt-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Branch Strategy</h4>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li><code>main</code>: Production releases (protected)</li>
                            <li><code>develop</code>: Integration branch (protected)</li>
                            <li><code>feature/*</code>: New features</li>
                            <li><code>bugfix/*</code>: Bug fixes</li>
                            <li><code>hotfix/*</code>: Critical fixes</li>
                        </ul>
                    </div>
                </>
            )
        },
        {
            title: 'Testing & Quality',
            icon: <FaTools className="text-2xl text-purple-500 mb-4" />,
            content: (
                <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Testing Strategy</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Comprehensive testing at multiple levels:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Test Types</h4>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Unit Tests (Jest) - 80% coverage</li>
                                <li>Integration Tests (Jest) - 70% coverage</li>
                                <li>E2E Tests (Playwright) - 60% coverage</li>
                                <li>Performance Tests - 50% coverage</li>
                            </ul>
                        </div>

                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Test Commands</h4>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li><code>npm test</code> - All tests</li>
                                <li><code>npm run test:unit</code> - Unit tests</li>
                                <li><code>npm run test:coverage</code> - With coverage</li>
                                <li><code>npm run lint</code> - Code quality</li>
                            </ul>
                        </div>
                    </div>

                    <CodeBlock
                        language="javascript"
                        code={`// Example test case
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventComponent from './EventComponent'

describe('EventComponent', () => {
  it('renders event details correctly', () => {
    const event = {
      id: 'event-123',
      title: 'Summer Party',
      date: '2023-12-25'
    }

    render(<EventComponent event={event} />)

    expect(screen.getByText('Summer Party')).toBeInTheDocument()
    expect(screen.getByText('Dec 25, 2023')).toBeInTheDocument()
  })
})`}
                    />
                </>
            )
        },
        {
            title: 'Deployment',
            icon: <FaChartBar className="text-2xl text-orange-500 mb-4" />,
            content: (
                <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Deployment Process</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Automated CI/CD pipeline with manual approval for production:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Deployment Stages</h4>
                            <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Code commit triggers pipeline</li>
                                <li>Automated testing (unit, integration, E2E)</li>
                                <li>Build process creates artifacts</li>
                                <li>Staging deployment</li>
                                <li>Manual approval</li>
                                <li>Production deployment</li>
                            </ol>
                        </div>

                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border border-gray-200 dark:border-gray-700`}>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Deployment Commands</h4>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                                <li><code>npm run build</code> - Production build</li>
                                <li><code>./deploy.sh</code> - Deploy to production</li>
                                <li><code>pm2 status</code> - Check process status</li>
                                <li><code>sudo systemctl status nginx</code> - Check web server</li>
                            </ul>
                        </div>
                    </div>

                    <CodeBlock
                        language="bash"
                        code={`# Build for production
npm run build

# Deploy to production
./deploy.sh

# Check deployment status
pm2 status
sudo systemctl status nginx

# Rollback procedure
pm2 stop snapify
cp /var/www/backups/snapify_backup_20231201.tar.gz .
tar -xzf snapify_backup_20231201.tar.gz
pm2 start snapify`}
                    />
                </>
            )
        }
    ]

    return (
        <div className="max-w-6xl mx-auto">
            <section className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Developer Guides</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Comprehensive guides to help you get started with Snapify development, from setup to deployment.
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                    <Link
                        to="/api-reference"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                        <FaCode className="inline mr-1" /> API Reference
                    </Link>
                    <Link
                        to="/architecture"
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    >
                        <FaCogs className="inline mr-1" /> Architecture
                    </Link>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Development Resources</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Key Resources</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li><a href="https://react.dev/learn" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">React Documentation</a></li>
                            <li><a href="https://www.typescriptlang.org/docs/handbook" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">TypeScript Handbook</a></li>
                            <li><a href="https://expressjs.com/en/guide" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Express.js Guide</a></li>
                            <li><a href="https://socket.io/docs/v4" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Socket.IO Documentation</a></li>
                        </ul>
                    </div>

                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Community</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Slack Channel: #snapify-dev</li>
                            <li>Weekly Sync: Fridays at 10:00 AM UTC</li>
                            <li>Tech Talks: Bi-weekly knowledge sharing</li>
                            <li>Hackathons: Quarterly innovation events</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Development Guides</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {guideSections.map((section, index) => (
                        <div key={index} className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                            {section.icon}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{section.title}</h3>
                            {section.content}
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Onboarding Checklist</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Week 1: Foundation</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Project architecture overview</li>
                            <li>Development environment setup</li>
                            <li>Basic development workflow</li>
                            <li>First code contribution</li>
                        </ul>
                    </div>

                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Week 2: Core Systems</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Authentication system</li>
                            <li>Event management</li>
                            <li>Media processing</li>
                            <li>Real-time features</li>
                        </ul>
                    </div>

                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Week 3: Advanced Topics</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Performance optimization</li>
                            <li>Testing strategies</li>
                            <li>Deployment processes</li>
                            <li>Monitoring and logging</li>
                        </ul>
                    </div>

                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Week 4: Full Integration</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>End-to-end feature development</li>
                            <li>Production deployment</li>
                            <li>Monitoring and troubleshooting</li>
                            <li>Team collaboration</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Contribution Guidelines</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Pull Request Requirements</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Clear, descriptive title</li>
                            <li>Detailed description (what, why, how)</li>
                            <li>Test coverage for new features</li>
                            <li>Documentation updates</li>
                            <li>Address all feedback</li>
                        </ul>
                    </div>

                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Code of Conduct</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Be respectful and collaborative</li>
                            <li>Maintain professional standards</li>
                            <li>Welcome feedback and ideas</li>
                            <li>Follow established patterns</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default DeveloperGuides