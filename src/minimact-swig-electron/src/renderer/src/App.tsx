import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CreateProject from './pages/CreateProject'
import Dashboard from './pages/Dashboard'
import TemplateInspector from './pages/TemplateInspector'

function App(): React.JSX.Element {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-project" element={<CreateProject />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/template-inspector" element={<TemplateInspector />} />
      </Routes>
    </Router>
  )
}

export default App
