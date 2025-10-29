import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CreateProject from './pages/CreateProject'
import Dashboard from './pages/Dashboard'

function App(): React.JSX.Element {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-project" element={<CreateProject />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  )
}

export default App
