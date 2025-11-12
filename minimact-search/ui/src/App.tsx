import { useState, useEffect } from 'react'
import { Search, Zap, TrendingUp, Clock, Users } from 'lucide-react'
import { useCommunityHub } from './hooks/useCommunityHub'
import './App.css'

interface Project {
  id: string
  name: string
  url: string
  category: string
  tags: string[]
  developer: {
    username: string
    displayName?: string
    reputation: number
  }
  timestamp: string
}

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'search' | 'trending' | 'recent'>('recent')
  const [recentDeployments, setRecentDeployments] = useState<Project[]>([])

  // Connect to SignalR hub
  const { isConnected, newDeployment } = useCommunityHub()

  // Add new deployments to the feed in real-time
  useEffect(() => {
    if (newDeployment) {
      setRecentDeployments(prev => [newDeployment, ...prev].slice(0, 20))
    }
  }, [newDeployment])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    // TODO: Call search API
    console.log('Searching for:', searchQuery)
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Zap className="logo-icon" />
            <h1>Mactic</h1>
            <span className="tagline">Stop crawling. Start running.</span>
          </div>

          <div className="connection-status">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            <span>{isConnected ? 'Live' : 'Connecting...'}</span>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search projects, developers, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            Search
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          <Clock size={16} />
          Recent Deployments
        </button>
        <button
          className={`tab ${activeTab === 'trending' ? 'active' : ''}`}
          onClick={() => setActiveTab('trending')}
        >
          <TrendingUp size={16} />
          Trending
        </button>
        <button
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={16} />
          Search Results
        </button>
      </div>

      {/* Content */}
      <div className="content">
        {activeTab === 'recent' && (
          <div className="deployments">
            <h2>
              <Zap size={20} className="pulse-icon" />
              Live Deployments
            </h2>
            {recentDeployments.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <p>Waiting for deployments...</p>
                <small>Deploy an app with Mactic tracker to see it here instantly!</small>
              </div>
            ) : (
              <div className="deployment-list">
                {recentDeployments.map((deployment, index) => (
                  <div key={`${deployment.id}-${index}`} className="deployment-card fade-in">
                    <div className="deployment-header">
                      <h3>{deployment.project.name}</h3>
                      <span className="deployment-time">
                        {new Date(deployment.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="deployment-meta">
                      <span className="category">{deployment.project.category}</span>
                      <span className="developer">
                        by {deployment.developer.displayName || deployment.developer.username}
                      </span>
                      <span className="reputation">
                        ⭐ {deployment.developer.reputation}
                      </span>
                    </div>
                    <div className="deployment-tags">
                      {deployment.project.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <a
                      href={deployment.project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="deployment-link"
                    >
                      Visit →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="empty-state">
            <TrendingUp size={48} />
            <p>Trending projects coming soon!</p>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="empty-state">
            <Search size={48} />
            <p>Search results will appear here</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <footer className="footer">
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Deployments Today</span>
            <span className="stat-value">{recentDeployments.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Connected Clients</span>
            <span className="stat-value">{isConnected ? '1+' : '0'}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Status</span>
            <span className={`stat-value ${isConnected ? 'text-green' : 'text-red'}`}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
