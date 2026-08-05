import React from 'react'
import ReactDOM from 'react-dom/client'
import ProductGrid from './components/ProductGrid.jsx'
import './index.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Emporium</h1>
        <nav className="nav">
          <a href="/">Products</a>
          <button>Login / Register</button>
        </nav>
      </header>
      
      <main className="main">
        <ProductGrid apiBase={API_BASE} />
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)