import { Link, useLocation } from 'react-router-dom';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { deviceIdentifier } from '../utils/deviceIdentitifier';

export default function Navbar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navigation = [
    { name: 'Collections', href: '/collections', key: 'collections' },
    { name: 'Products', href: '/products', key: 'products' },
    {
      name: 'Collections Sync',
      href: '/collections-sync',
      key: 'collections-sync',
    },
    { name: 'Products Sync', href: '/products-sync', key: 'products-sync' },
    { name: 'Pages Sync', href: '/pages-sync', key: 'pages-sync' },
  ];

  return (
    <nav className="bg-gray-800 shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center font-semibold">
              <img
                src="/logo.svg"
                alt="Foxstow Shaker Doors"
                className="h-10 ml-1 mr-4"
              />
              Shopify Sync App
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.key}
                  to={item.href}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    currentPath === item.href
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-gray-300 hover:border-gray-300 hover:text-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          {!deviceIdentifier.isWeb && (
            <div className="flex items-center">
              <Link
                to="/settings"
                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                  currentPath === '/settings' ? 'bg-gray-700' : ''
                }`}
                title="Settings"
              >
                <Cog6ToothIcon
                  className={`h-6 w-6 ${
                    currentPath === '/settings'
                      ? 'text-blue-500'
                      : 'text-gray-300 hover:text-white'
                  }`}
                />
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
