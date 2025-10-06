import React from 'react';
import { motion } from 'framer-motion';
import { Box, Calendar, FileText, Home, LogOut, Package, Theater, Zap, HelpCircle } from 'lucide-react';
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

  React.useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      // Auto-collapse on tablet widths (<1024px)
      setNavCollapsed(prev => (w < 1024 ? true : prev));
    };
    onResize();
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
    { icon: Home, text: 'Home', subtext: 'Dashboard overview', link: '/' },
    { icon: Package, text: 'Props Inventory', subtext: 'Manage all production props', link: '/props' },
    { icon: FileText, text: 'Import Props', subtext: 'CSV import', link: '/props?import=1' },
    { icon: FileText, text: 'Export Props PDF', subtext: 'Download props list as PDF', link: '/props/pdf-export' },
    { icon: Box, text: 'Packing Lists', subtext: 'packing & storage management', link: '/packing-lists' },
    { icon: Theater, text: 'Show Management', subtext: 'Manage productions and venues', link: '/shows' },
    { icon: Calendar, text: 'Task Boards', subtext: 'Kanban-style to-do boards', link: '/boards' },
    { icon: Zap, text: 'Shopping List', subtext: 'Track props and materials to buy', link: '/shopping' },
    { icon: HelpCircle, text: 'Help', subtext: 'Documentation and support', link: '/help' },
  ] as Array<{ icon: any; text: string; subtext: string; link?: string }>;
  if (userProfile?.role === 'god') {
    navItems.push({ icon: FileText, text: 'Subscriber Stats', subtext: 'Plans and status breakdown', link: '/admin/subscribers' });
    navItems.push({ icon: FileText, text: 'Admin Debug', subtext: 'Debug admin functionality', link: '/admin/debug' });
  }

  return (
    <div className="min-h-screen bg-gradient-dark text-white overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-pb-darker/50 backdrop-blur-sm border-b border-pb-primary/20">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-pb-primary rounded-lg flex items-center justify-center">
              <Theater className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">The Props List</h1>
              <p className="text-xs text-pb-gray">Theater Props Management</p>
            </div>
          </div>
          <Link
            to="#"
            onClick={(e) => { e.preventDefault(); alert('Mobile app coming soon'); }}
            className="bg-pb-primary/20 text-pb-primary px-3 py-1 rounded-full text-xs font-medium hover:bg-pb-primary/30"
            title="Open mobile app (coming soon)"
          >
            Open App (Coming Soon)
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <span className="text-white text-lg font-semibold">
            {showTitle || "No show selected"}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {userProfile?.displayName && (
            <span className="text-sm text-pb-gray">Welcome, {userProfile.displayName}</span>
          )}
          <Link to="/feedback" className="text-xs text-pb-primary underline">Report a bug</Link>
          <NotificationBell />
          <Link to="/profile" className="relative block">
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
              if (!userProfile?.organizations || userProfile.organizations.length === 0) missing.push('org');
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
            className="ml-2 flex items-center px-2 py-1 rounded hover:bg-pb-primary/20 transition-colors text-pb-gray hover:text-white focus:outline-none"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`${navCollapsed ? 'w-16 p-2' : 'w-64 p-4'} hidden md:block bg-pb-darker/30 backdrop-blur-sm border-r border-pb-primary/20 space-y-4 transition-all duration-300`}
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
              {navItems.map((item, index) => (
                item.link ? (
                  <Link to={item.link} key={index} className="block" title={item.text} aria-label={item.text}>
                    <motion.div
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                      className={`${navCollapsed ? 'justify-center' : ''} flex items-center space-x-3 p-3 rounded-lg bg-pb-primary/10 hover:bg-pb-primary/20 transition-colors cursor-pointer group`}
                    >
                      <div className={`${navCollapsed ? 'w-10 h-10' : 'w-8 h-8'} bg-pb-primary/20 rounded-lg flex items-center justify-center group-hover:bg-pb-primary/30 transition-colors`}>
                        <item.icon className="w-4 h-4 text-pb-primary" />
                      </div>
                      {!navCollapsed && (
                        <div>
                          <p className="text-sm font-medium text-white">{item.text}</p>
                          <p className="text-xs text-pb-gray">{item.subtext}</p>
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
                    className={`${navCollapsed ? 'justify-center' : ''} flex items-center space-x-3 p-3 rounded-lg bg-pb-primary/10 hover:bg-pb-primary/20 transition-colors cursor-pointer group`}
                    title={item.text}
                    aria-label={item.text}
                  >
                    <div className={`${navCollapsed ? 'w-10 h-10' : 'w-8 h-8'} bg-pb-primary/20 rounded-lg flex items-center justify-center group-hover:bg-pb-primary/30 transition-colors`}>
                      <item.icon className="w-4 h-4 text-pb-primary" />
                    </div>
                    {!navCollapsed && (
                      <div>
                        <p className="text-sm font-medium text-white">{item.text}</p>
                        <p className="text-xs text-pb-gray">{item.subtext}</p>
                      </div>
                    )}
                  </motion.div>
                )
              ))}
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-hidden ${isBoardsPage ? 'px-0 py-6' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 