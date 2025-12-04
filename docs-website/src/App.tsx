import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { DocumentationProvider } from './context/DocumentationContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ApiReference from './pages/ApiReference'
import Architecture from './pages/Architecture'
import DeveloperGuides from './pages/DeveloperGuides'
import SearchResults from './pages/SearchResults'
import InteractiveApiExplorer from './pages/InteractiveApiExplorer'
import NotFound from './pages/NotFound'

function App() {
    return (
        <Router>
            <ThemeProvider>
                <DocumentationProvider>
                    <Layout>
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/api-reference" element={<ApiReference />} />
                            <Route path="/architecture" element={<Architecture />} />
                            <Route path="/developer-guides" element={<DeveloperGuides />} />
                            <Route path="/interactive-api" element={<InteractiveApiExplorer />} />
                            <Route path="/search" element={<SearchResults />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </Layout>
                </DocumentationProvider>
            </ThemeProvider>
        </Router>
    )
}

export default App