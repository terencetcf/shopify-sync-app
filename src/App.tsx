import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Collections from './pages/Collections';
import Products from './pages/Products';
import Sync from './pages/CollectionsSync';
import ProductSync from './pages/ProductsSync';
import PagesSync from './pages/PagesSync';
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
            <Route path="/collections-sync" element={<Sync />} />
            <Route path="/products-sync" element={<ProductSync />} />
            <Route path="/pages-sync" element={<PagesSync />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
export default App;
