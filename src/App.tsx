import { useState } from 'react';
import Navbar from './components/Navbar';
import Collections from './pages/Collections';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('collections');

  const renderPage = () => {
    switch (currentPage) {
      case 'collections':
        return <Collections />;
      // Add other pages here
      default:
        return <Collections />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="container mx-auto px-4 py-8">{renderPage()}</main>
    </div>
  );
}

export default App;
