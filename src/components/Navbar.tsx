import { Link, useLocation } from 'react-router-dom';

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
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link to="/" className="text-xl font-semibold text-white">
                Shopify Sync
              </Link>
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
        </div>
      </div>
    </nav>
  );
}
