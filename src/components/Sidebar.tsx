import React from 'react';
import { Link, usePathname } from 'expo-router';
import { Box, Calendar, Package } from 'lucide-react'; // Assuming lucide-react is used

const Sidebar = () => {
  const pathname = usePathname(); // Get current path

  // Function to determine if a link is active
  const isActive = (href: string) => pathname === href;

  // Define base, active, and hover classes
  const baseLinkClasses = "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors";
  const inactiveLinkClasses = "text-gray-400 hover:bg-gray-700 hover:text-white";
  const activeLinkClasses = "bg-gray-900 text-white"; // Active state style
  const iconClasses = "mr-3 h-5 w-5 flex-shrink-0"; // Added flex-shrink-0

  return (
    <div className="w-64 h-screen bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text-primary flex flex-col p-4 shadow-lg border-r border-gray-200 dark:border-dark-border">
      <div className="mb-8 flex items-center justify-center h-16 flex-shrink-0">
        {/* Logo removed, new link will be part of the nav */}
      </div>
      <nav className="flex-grow space-y-1">
        <Link
          href="/props"
          className={`${baseLinkClasses} ${isActive('/props') ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <Box className={iconClasses} />
          Props
        </Link>
        <Link
          href="/shows"
          className={`${baseLinkClasses} ${isActive('/shows') ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <Calendar className={iconClasses} />
          Shows
        </Link>
        <Link
          href="/packing"
          className={`${baseLinkClasses} ${isActive('/packing') ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <Package className={iconClasses} />
          Packing
        </Link>
        <Link
          href="/todos" // Points to the new Task Boards tab
          className={`${baseLinkClasses} ${isActive('/todos') ? activeLinkClasses : inactiveLinkClasses}`}
        >
          <Package className={iconClasses} /> {/* Using Package icon for now */}
          Task Boards
        </Link>
        {/* Add other navigation items here using the same pattern */}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
        {/* Placeholder for user profile or settings link */}
        <p className="text-xs text-gray-500 dark:text-dark-text-secondary text-center">© 2025 Props Bible</p>
      </div>
    </div>
  );
};

export default Sidebar; 