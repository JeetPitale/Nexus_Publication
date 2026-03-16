import React, { useEffect } from 'react'
import Dashboard from './Dashboard'
import './index.css'

function App() {
  useEffect(() => {
    // Anti-copy protection removed.
  }, []);

  return (
    <div className="App">
      <Dashboard />
    </div>
  )
}

export default App
