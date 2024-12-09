import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Collections from './pages/Collections';
import Products from './pages/Products';
import Sync from './pages/CollectionsSync';
import ProductSync from './pages/ProductsSync';
import PagesSync from './pages/PagesSync';
import Settings from './pages/Settings';
import LoadingScreen from './components/LoadingScreen';
import './App.css';
import { useEffect, useState } from 'react';
import { useSettingsStore } from './stores/useSettingsStore';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { initialize, error } = useSettingsStore();

  useEffect(() => {
    const initializeApp = async () => {
      await initialize();
      setIsInitialized(true);
    };

    initializeApp();
  }, [initialize]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-md">
          <h1 className="text-red-500 text-2xl font-bold mb-4">
            Initialization Error
          </h1>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <main className="max-w-[1600px] mx-auto px-1 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/collections" replace />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/products" element={<Products />} />
            <Route path="/collections-sync" element={<Sync />} />
            <Route path="/products-sync" element={<ProductSync />} />
            <Route path="/pages-sync" element={<PagesSync />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
