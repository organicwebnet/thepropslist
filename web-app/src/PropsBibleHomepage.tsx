import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, BarChart3, Bell, Box, Calendar, CheckCircle, Crown, FileBarChart, FileText, Home, LogOut, Package, Package2, Plus, Scroll, Search, Settings, Star, Theater, User, Users, Wrench, Zap } from 'lucide-react';
import { useWebAuth } from './contexts/WebAuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useShowSelection } from "./contexts/ShowSelectionContext";
import type { Show } from "./types/Show";
import { useFirebase } from "./contexts/FirebaseContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      duration: 0.5
    }
  }
};

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

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4
    }
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2
    }
  }
};

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { userProfile, signOut } = useWebAuth();
  const [now, setNow] = React.useState(() => new Date());
  const navigate = useNavigate();
  const { currentShowId } = useShowSelection();
  const { service } = useFirebase();
  const [showTitle, setShowTitle] = React.useState<string>("");

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!currentShowId) {
      setShowTitle("");
      return;
    }
    let unsub: (() => void) | undefined;
    unsub = service.listenToDocument<Show>(
      `shows/${currentShowId}`,
      doc => setShowTitle(doc.data?.name || ""),
      () => setShowTitle("")
    );
    return () => { if (unsub) unsub(); };
  }, [service, currentShowId]);

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const welcome = userProfile?.displayName ? `Welcome, ${userProfile.displayName}` : 'Welcome';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-pb-darker/50 backdrop-blur-sm border-b border-pb-primary/20">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-pb-primary rounded-lg flex items-center justify-center">
              <Theater className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Props Bible</h1>
              <p className="text-xs text-pb-gray">Theater Props Management</p>
            </div>
          </div>
          <div className="bg-pb-primary/20 text-pb-primary px-3 py-1 rounded-full text-xs font-medium">
            Web Platform
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <span className="text-pb-primary text-lg font-semibold">
            {showTitle || "No show selected"}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-pb-gray">
            {userProfile?.displayName
              ? `Welcome, ${userProfile.displayName} • ${timeString}`
              : `Welcome • ${timeString}`}
          </span>
          <div className="relative">
            <Bell className="w-5 h-5 text-pb-gray hover:text-white cursor-pointer" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-pb-accent rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">3</span>
            </div>
          </div>
          <Settings className="w-5 h-5 text-pb-gray hover:text-white cursor-pointer" />
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
          className="w-64 bg-pb-darker/30 backdrop-blur-sm border-r border-pb-primary/20 p-4 space-y-6"
        >
          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold text-pb-gray uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                { icon: Home, text: 'Home', subtext: 'Dashboard overview', link: '/' },
                { icon: Package, text: 'Props Inventory', subtext: 'Manage all production props', link: '/props' },
                { icon: FileText, text: 'Export Props PDF', subtext: 'Download props list as PDF', link: '/props' },
                { icon: Box, text: 'Packing Lists', subtext: 'packing & storage management', link: '/packing-lists' },
                { icon: Theater, text: 'Show Management', subtext: 'Manage productions and venues', link: '/shows' },
                { icon: Calendar, text: 'Task Boards', subtext: 'Kanban-style to-do boards', link: '/boards' },
              ].map((item, index) => (
                item.link ? (
                  <Link to={item.link} key={index} className="block">
                    <motion.div
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-3 p-3 rounded-lg bg-pb-primary/10 hover:bg-pb-primary/20 transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 bg-pb-primary/20 rounded-lg flex items-center justify-center group-hover:bg-pb-primary/30 transition-colors">
                        <item.icon className="w-4 h-4 text-pb-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.text}</p>
                        <p className="text-xs text-pb-gray">{item.subtext}</p>
                      </div>
                    </motion.div>
                  </Link>
                ) : (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-pb-primary/10 hover:bg-pb-primary/20 transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 bg-pb-primary/20 rounded-lg flex items-center justify-center group-hover:bg-pb-primary/30 transition-colors">
                      <item.icon className="w-4 h-4 text-pb-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.text}</p>
                      <p className="text-xs text-pb-gray">{item.subtext}</p>
                    </div>
                  </motion.div>
                )
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-pb-gray uppercase tracking-wider mb-3">
              Navigation
            </h3>
            <div className="space-y-2">
              {[
                { icon: Calendar, text: 'Task Boards' },
                { icon: BarChart3, text: 'Analytics' },
                { icon: Users, text: 'Collaboration' },
                { icon: FileBarChart, text: 'Reports' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: (index + 4) * 0.1 }}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-pb-primary/10 transition-colors cursor-pointer text-pb-gray hover:text-white"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 