import { useState, useEffect } from 'react';
import { ArrowUpIcon } from '@heroicons/react/24/outline';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-all duration-200 z-40"
          title="Scroll to top"
        >
          <ArrowUpIcon className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
