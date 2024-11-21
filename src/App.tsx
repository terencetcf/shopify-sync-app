import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Collections from './pages/Collections';
import Products from './pages/Products';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/collections" replace />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/products" element={<Products />} />
            <Route path="/theme" element={<div>Theme Coming Soon</div>} />
            <Route path="/settings" element={<div>Settings Coming Soon</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
