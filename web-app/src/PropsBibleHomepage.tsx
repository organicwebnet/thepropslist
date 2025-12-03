import React from 'react';
import { motion } from 'framer-motion';
import { Box, Calendar, FileText, Home, LogOut, Package, Theater, Zap, HelpCircle, Users, Shield, TestTube } from 'lucide-react';
import NotificationBell from './components/NotificationBell';
import { useWebAuth } from './contexts/WebAuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useShowSelection } from "./contexts/ShowSelectionContext";
import type { Show } from "./types/Show";
import { useFirebase } from "./contexts/FirebaseContext";
import Avatar from './components/Avatar';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { userProfile, signOut } = useWebAuth();
  const navigate = useNavigate();
  const { currentShowId } = useShowSelection();
  const { service } = useFirebase();
  const [showTitle, setShowTitle] = React.useState<string>("");
  const [navCollapsed, setNavCollapsed] = React.useState(false);
  const location = useLocation();
  const isBoardsPage = location.pathname.startsWith('/boards');
  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
    // Set initial state based on screen size
    const w = window.innerWidth;
    if (w < 768) {
      setNavCollapsed(true);
    } else if (w >= 768 && w < 1024) {
      setNavCollapsed(true);
    } else {
      setNavCollapsed(false); // Desktop default to expanded
    }
    isInitialMount.current = false;
    
    const onResize = () => {
      const w = window.innerWidth;
      if (w < 768) {
        // Mobile - always collapse
        setNavCollapsed(true);
      } else if (w >= 768 && w < 1024) {
        // Tablet - always collapse (smaller screen space)
        setNavCollapsed(true);
      }
      // Desktop (>= 1024px) - preserve user's manual preference
      // Don't change state on resize - let user's toggle preference persist
    };
    
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    const cls = 'route-boards';
    if (isBoardsPage) document.body.classList.add(cls); else document.body.classList.remove(cls);
    return () => { document.body.classList.remove(cls); };
  }, [isBoardsPage]);

  React.useEffect(() => {
    if (!currentShowId) {
      setShowTitle("");
      return;
    }
    const unsub = service.listenToDocument<Show>(
      `shows/${currentShowId}`,
      doc => setShowTitle(doc.data?.name || ""),
      () => setShowTitle("")
    );
    return () => { if (unsub) unsub(); };
  }, [service, currentShowId]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Build sidebar items and append god-only entries
  const navItems = [
    { icon: Home, text: 'Home', subtext: 'Dashboard overview', shortLabel: 'Home', link: '/', color: '#60a5fa' }, // Blue
    { icon: Calendar, text: 'Task Boards', subtext: 'Kanban-style to-do boards', shortLabel: 'task', link: '/boards', color: '#10b981' }, // Green
    { icon: Package, text: 'Props Inventory', subtext: 'Manage all production props', shortLabel: 'prop', link: '/props', color: '#34d399' }, // Emerald
    { icon: Theater, text: 'Show Management', subtext: 'Manage productions, venues, and team members', shortLabel: 'show', link: '/shows', color: '#ec4899' }, // Pink
    { icon: Zap, text: 'Shopping List', subtext: 'Track props and materials to buy', shortLabel: 'shop', link: '/shopping', color: '#f59e0b' }, // Yellow
    { icon: Box, text: 'Packing Lists', subtext: 'packing & storage management', shortLabel: 'pack', link: '/packing-lists', color: '#a78bfa' }, // Violet
    { icon: FileText, text: 'Import Props', subtext: 'CSV import', shortLabel: 'import', link: '/props?import=1', color: '#fbbf24' }, // Amber
    { icon: FileText, text: 'Export Props PDF', subtext: 'Download props list as PDF', shortLabel: 'export', link: '/props/pdf-export', color: '#fb923c' }, // Orange
    { icon: HelpCircle, text: 'Help', subtext: 'Documentation and support', shortLabel: 'help', link: '/help', color: '#8b5cf6' }, // Purple
  ] as Array<{ icon: any; text: string; subtext: string; shortLabel: string; link?: string; color: string }>;
  if (userProfile?.role === 'god') {
    navItems.push({ icon: Users, text: 'User Management', subtext: 'Manage all users and roles', shortLabel: 'users', link: '/admin/users', color: '#06b6d4' }); // Cyan
    navItems.push({ icon: Shield, text: 'Role Management', subtext: 'Manage job roles and permissions', shortLabel: 'roles', link: '/admin/roles', color: '#3b82f6' }); // Blue
    navItems.push({ icon: TestTube, text: 'Permission Tests', subtext: 'Test permission system functionality', shortLabel: 'test', link: '/admin/permission-tests', color: '#ef4444' }); // Red
    navItems.push({ icon: FileText, text: 'Subscriber Stats', subtext: 'Plans and status breakdown', shortLabel: 'stats', link: '/admin/subscribers', color: '#14b8a6' }); // Teal
  }

  return (
    <div className="min-h-screen bg-gradient-dark text-white overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-pb-darker/50 backdrop-blur-sm border-b border-pb-primary/20 gap-3 md:gap-0">
        <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-pb-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Theater className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg lg:text-xl font-bold text-white truncate">The Props List</h1>
              <p className="text-xs md:text-sm text-pb-gray hidden md:block">Theater Props Management</p>
            </div>
          </div>
          <Link
            to="/beta/"
            className="bg-red-500/20 text-red-400 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium hover:bg-red-500/30 whitespace-nowrap flex-shrink-0 min-h-[44px] md:min-h-0 flex items-center"
            title="Learn about our beta release"
          >
            Beta version
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center md:justify-center min-w-0 px-2 md:px-0">
          <span className="text-white text-sm md:text-base lg:text-lg font-semibold truncate w-full text-center">
            {showTitle || "No show selected"}
          </span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto justify-end">
          {userProfile?.displayName && (
            <span className="text-xs md:text-sm text-pb-gray hidden lg:inline truncate max-w-[120px] md:max-w-none">
              Welcome, {userProfile.displayName.split(' ')[0]}
            </span>
          )}
          <Link to="/feedback" className="text-xs md:text-sm text-pb-primary underline hidden lg:inline whitespace-nowrap min-h-[44px] md:min-h-0 flex items-center">Report a bug</Link>
          <div className="min-h-[44px] md:min-h-0 flex items-center">
            <NotificationBell />
          </div>
          <Link to="/profile" className="relative block flex-shrink-0 min-h-[44px] md:min-h-0 flex items-center">
            <Avatar
              src={userProfile?.photoURL}
              alt="Profile"
              name={userProfile?.displayName}
              size="md"
              className="border border-pb-primary/40"
            />
            {(() => {
              const missing: string[] = [];
              if (!userProfile?.displayName) missing.push('name');
              if (!userProfile?.photoURL) missing.push('photo');
              const incomplete = missing.length > 0;
              return incomplete ? (
                <span
                  title={`Complete your profile: ${missing.join(', ')}`}
                  className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 border border-black animate-pulse"
                  aria-label="Profile incomplete"
                />
              ) : null;
            })()}
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center px-2 md:px-3 py-2 md:py-1 rounded hover:bg-pb-primary/20 transition-colors text-pb-gray hover:text-white focus:outline-none flex-shrink-0 min-h-[44px] md:min-h-0"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`${navCollapsed ? 'w-16 py-2' : 'w-56 md:w-60 lg:w-64 p-3 md:p-4'} hidden sm:block bg-pb-darker/30 backdrop-blur-sm border-r border-pb-primary/20 space-y-2 md:space-y-3 lg:space-y-4 transition-all duration-300 flex-shrink-0`}
        >
          {/* Collapse toggle */}
          <div className="flex items-center justify-between mb-2">
            {!navCollapsed && (
              <h3 className="text-sm font-semibold text-pb-gray uppercase tracking-wider">Quick Actions</h3>
            )}
            <button
              className="text-pb-gray hover:text-white bg-pb-darker/60 border border-pb-primary/30 rounded px-2 py-1"
              onClick={() => setNavCollapsed(v => !v)}
              aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {navCollapsed ? '»' : '«'}
            </button>
          </div>

          {/* Quick Actions */}
          <div>
            <div className={navCollapsed ? 'space-y-2' : 'space-y-2'}>
              {navItems.map((item, index) => {
                const isActive = location.pathname === item.link || 
                  (item.link === '/shopping' && location.pathname === '/shopping-list') ||
                  (item.link === '/shopping-list' && location.pathname === '/shopping');
                
                return item.link ? (
                  <Link to={item.link} key={index} className="block" title={item.text} aria-label={item.text}>
                    <motion.div
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                      className={`${navCollapsed ? 'flex-col justify-center items-center py-2' : 'space-x-2 md:space-x-3'} flex items-center ${navCollapsed ? '' : 'p-2 md:p-3'} rounded-lg transition-colors cursor-pointer group min-h-[44px] md:min-h-0 ${
                        isActive 
                          ? 'bg-pb-primary/30 border border-pb-primary/50' 
                          : 'bg-pb-primary/10 hover:bg-pb-primary/20'
                      }`}
                    >
                      <div 
                        className={`${navCollapsed ? 'w-10 h-10' : 'w-8 h-8 md:w-9 md:h-9'} rounded-lg flex items-center justify-center transition-colors flex-shrink-0`}
                        style={{ 
                          backgroundColor: `${item.color}20`,
                        }}
                      >
                        <item.icon className={`${navCollapsed ? 'w-5 h-5' : 'w-4 h-4 md:w-5 md:h-5'}`} style={{ color: item.color }} />
                      </div>
                      {navCollapsed ? (
                        <span className="text-[10px] md:text-xs mt-1 text-center leading-tight !ml-0 !mr-0 block md:hidden lg:block" style={{ color: item.color, marginLeft: '0 !important', marginRight: '0 !important' }}>
                          {item.shortLabel}
                        </span>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <p className="text-sm md:text-base font-medium text-white truncate">{item.text}</p>
                          <p className="text-xs md:text-sm text-pb-gray truncate">{item.subtext}</p>
                        </div>
                      )}
                    </motion.div>
                  </Link>
                ) : (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                    className={`${navCollapsed ? 'flex-col justify-center items-center py-2' : 'space-x-3'} flex items-center ${navCollapsed ? '' : 'p-3'} rounded-lg bg-pb-primary/10 hover:bg-pb-primary/20 transition-colors cursor-pointer group`}
                    title={item.text}
                    aria-label={item.text}
                  >
                    <div 
                      className={`${navCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center transition-colors`}
                      style={{ 
                        backgroundColor: `${item.color}20`,
                      }}
                    >
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    {navCollapsed ? (
                      <span className="text-[10px] md:text-xs mt-1 text-center leading-tight !ml-0 !mr-0 block md:hidden lg:block" style={{ color: item.color, marginLeft: '0 !important', marginRight: '0 !important' }}>
                        {item.shortLabel}
                      </span>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-white">{item.text}</p>
                        <p className="text-xs text-pb-gray">{item.subtext}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className={`flex-1 min-w-0 ${isBoardsPage ? 'px-0 py-4 md:py-6 overflow-visible' : 'p-4 md:p-5 lg:p-6 overflow-hidden'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 