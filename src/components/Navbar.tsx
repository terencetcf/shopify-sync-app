import { NavLink } from 'react-router-dom';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { deviceIdentifier } from '../utils/deviceIdentifier';
import { version } from '../../package.json';

const navigation = [
  { name: 'Collections', href: '/collections-sync' },
  { name: 'Products', href: '/products-sync' },
  { name: 'Pages', href: '/pages-sync' },
  { name: 'Files', href: '/files-sync' },
];

export default function Navbar() {
  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-6">
      <div className="mx-auto px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <img className="h-8 w-auto" src="/logo.svg" alt="Shopify Sync" />
            </div>
            <div className="ml-6 flex space-x-8">
              {navigation.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                      isActive
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-gray-300 hover:border-gray-300 hover:text-white'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[10px] text-gray-500">v{version}</span>

            {!deviceIdentifier.isWeb && (
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `rounded-lg p-2 text-gray-400 hover:text-white ${
                    isActive ? 'bg-gray-700' : ''
                  }`
                }
              >
                <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
