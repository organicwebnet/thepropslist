import React from 'react';
import DashboardLayout from './PropsBibleHomepage';
import { motion } from 'framer-motion';
import {
  Package,
  Theater,
  FileText,
  Plus,
  Package2,
  Box,
  Clock,
  CheckCircle,
  Zap,
  FileBarChart,
  BarChart3,
  Crown,
  Scroll,
  Star,
  Home,
  Calendar
} from 'lucide-react';

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
const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.4 }
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

const DashboardHome: React.FC = () => {
  // TODO: Replace with real show and stats data
  const currentShow = { title: 'Romeo & Juliet' };
  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Show Banner */}
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-r from-pb-primary to-pb-secondary rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-pb-primary/20 to-pb-secondary/20 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {currentShow?.title || 'Selected a Show'}
                </h2>
                <p className="text-pb-light/80">In Rehearsal • Tomorrow 7:30 PM • Royal Theater</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">18 days </div>
                <div className="text-pb-light/80 text-sm">until first night</div>
              </div>
            </div>
            <div className="w-full bg-pb-light/20 rounded-full h-2">
              <motion.div
                className="bg-pb-success h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '85%' }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statistics Cards */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { icon: Package2, label: 'Total Props', value: '67', color: 'bg-pb-blue' },
                { icon: Box, label: 'Packed', value: '58', color: 'bg-pb-green' },
                { icon: Clock, label: 'Pending Tasks', value: '8', color: 'bg-pb-orange' },
                { icon: CheckCircle, label: 'Ready for Show', value: '85%', color: 'bg-pb-success' }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  whileHover="hover"
                  className="bg-pb-darker/50 backdrop-blur-sm rounded-2xl p-4 border border-pb-primary/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 ${stat.color}/20 rounded-xl flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-pb-gray">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Production Management */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-pb-primary" />
                <h3 className="text-lg font-semibold text-white">Production Management</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                 { icon: Home, color: 'from-pb-primary to-pb-secondary', title: 'Home', subtitle: 'Dashboard overview', link: '/' },
                 { icon: Package, color: 'from-pb-blue to-pb-primary', title: 'Props Inventory', subtitle: 'Manage all production props', link: '/props' },
                 { icon: Box, color: 'from-pb-green to-pb-primary', title: 'Packing Lists', subtitle: 'Packing & storage management', link: '/packing-lists' },
                 { icon: Theater, color: 'from-pb-purple to-pb-primary', title: 'Show Management', subtitle: 'Manage productions and venues', link: '/shows' },
                 { icon: Calendar, color: 'from-pb-orange to-pb-primary', title: 'Task Boards', subtitle: 'Kanban-style to-do boards', link: '/boards' },
               ].map((item, index) => (
                  <motion.div
                    key={index}
                    variants={cardVariants}
                    whileHover="hover"
                    className={`bg-gradient-to-br ${item.color} rounded-2xl p-6 cursor-pointer group`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <item.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{item.title}</h4>
                        <p className="text-sm text-white/80">{item.subtitle}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Recent Props Activity */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <div className="bg-pb-darker/50 backdrop-blur-sm rounded-2xl p-6 border border-pb-primary/20 h-full">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-pb-accent" />
                <h3 className="text-lg font-semibold text-white">Recent Props Activity</h3>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Crown, title: 'Victorian Chair', subtitle: 'Added to Romeo & Juliet Act 2, Scene 1', user: 'Sarah (Props Master)', time: '5 min ago' },
                  { icon: Scroll, title: 'Wooden Sword', subtitle: 'Marked as packed in Box #12', user: 'Mike (Props Assistant)', time: '12 min ago' },
                  { icon: Star, title: 'Royal Goblet', subtitle: 'Condition updated: Needs minor repair', user: 'Emily (Stage Manager)', time: '18 min ago' },
                  { icon: Scroll, title: 'Love Letter Scroll', subtitle: 'QR code scanned at rehearsal', user: 'David (ASM)', time: '25 min ago' }
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-pb-primary/5 hover:bg-pb-primary/10 transition-colors"
                  >
                    <div className="w-8 h-8 bg-pb-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <activity.icon className="w-4 h-4 text-pb-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{activity.title}</p>
                      <p className="text-xs text-pb-gray">{activity.subtitle}</p>
                      <p className="text-xs text-pb-gray mt-1">{activity.user} • {activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Department Status */}
        <motion.div variants={itemVariants} className="bg-pb-darker/50 backdrop-blur-sm rounded-2xl p-6 border border-pb-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-pb-secondary" />
              <h3 className="text-lg font-semibold text-white">Department Status</h3>
            </div>
            <div className="w-10 h-10 bg-pb-secondary/20 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-pb-secondary" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { dept: 'Props Department', status: 'On Track', progress: 85, color: 'text-pb-success' },
              { dept: 'Stage Management', status: 'Ahead', progress: 92, color: 'text-pb-success' },
              { dept: 'Set Design', status: 'Behind', progress: 68, color: 'text-pb-warning' }
            ].map((dept, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-sm font-medium text-white mb-1">{dept.dept}</div>
                <div className={`text-xs ${dept.color} mb-2`}>{dept.status}</div>
                <div className="w-full bg-pb-primary/20 rounded-full h-2">
                  <motion.div
                    className="bg-pb-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${dept.progress}%` }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  />
                </div>
                <div className="text-xs text-pb-gray mt-1">{dept.progress}%</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default DashboardHome; 