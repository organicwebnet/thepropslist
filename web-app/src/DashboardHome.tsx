import React from 'react';
import DashboardLayout from './PropsBibleHomepage';
import { motion } from 'framer-motion';
import {
  FileText,
  Package2,
  Clock,
  CheckCircle,
  Crown,
  Star
} from 'lucide-react';
import { useShowSelection } from './contexts/ShowSelectionContext';
import { useFirebase } from './contexts/FirebaseContext';
import { useEffect, useState } from 'react';
import type { Show } from './types/Show';
import type { Prop } from './types/props';
import type { CardData } from './types/taskManager';
import { Link, useNavigate } from 'react-router-dom';
import OnboardingFlow from './components/OnboardingFlow';
import { useWebAuth } from './contexts/WebAuthContext';

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
  const { currentShowId } = useShowSelection();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { userProfile } = useWebAuth();

  useEffect(() => {
    // Show onboarding if user hasn't completed it
    if (userProfile && !userProfile.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [userProfile]);
  const { service } = useFirebase();
  const [show, setShow] = useState<Show | null>(null);
  const [props, setProps] = useState<Prop[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const { user } = useWebAuth();

  // Fetch show
  useEffect(() => {
    if (!currentShowId) return;
    const unsub = service.listenToDocument<Show>(
      `shows/${currentShowId}`,
      doc => setShow({ ...doc.data, id: doc.id }),
      () => setShow(null)
    );
    return () => { if (unsub) unsub(); };
  }, [service, currentShowId]);

  // Fetch props
  useEffect(() => {
    if (!currentShowId) return;
    const unsub = service.listenToCollection<Prop>(
      'props',
      data => setProps(data.filter(doc => doc.data.showId === currentShowId).map(doc => ({ ...doc.data, id: doc.id })) as any),
      () => setProps([])
    );
    return () => { if (unsub) unsub(); };
  }, [service, currentShowId]);

  // Fetch cards from all boards/lists for the show
  useEffect(() => {
    if (!currentShowId) return;
    let unsubCards: (() => void)[] = [];
    const unsubBoards = service.listenToCollection(
      'todo_boards',
      docs => {
        const filteredBoards = docs.filter(b => (b.data as any).showId === currentShowId);
        // Clear previous listeners
        unsubCards.forEach(u => u && u());
        unsubCards = [];
        filteredBoards.forEach(board => {
          service.listenToCollection(
            `todo_boards/${board.id}/lists`,
            lists => {
              lists.forEach(list => {
                const unsub = service.listenToCollection(
                  `todo_boards/${board.id}/lists/${list.id}/cards`,
                  cardsDocs => {
                    setCards(prev => {
                      const other = prev.filter((c: any) => c.listId !== list.id);
                      return [
                        ...other,
                        ...cardsDocs.map(cd => ({ ...(cd.data as CardData), id: cd.id, listId: (list as any).id }))
                      ];
                    });
                  }
                );
                unsubCards.push(unsub);
              });
            }
          );
        });
      }
    );
    return () => { if (unsubBoards) unsubBoards(); unsubCards.forEach(u => u && u()); };
  }, [service, currentShowId]);

  // Calculate stats
  const totalProps = props.length;
  const totalOutstandingTasks = cards.filter(card => !card.completed).length;
  const readyProps = props.filter(p => (p as any).status === 'with-stage-management').length;
  const showReadyPercent = totalProps > 0 ? Math.round((readyProps / totalProps) * 100) : 0;

  // Recent props activity
  function toDateSafe(input: any): Date | null {
    if (!input) return null;
    if (input instanceof Date) return input;
    if (typeof input === 'number') return new Date(input);
    if (typeof input === 'string' && input.trim() !== '') {
      const parsed = new Date(input);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (input && typeof input.toDate === 'function') {
      try {
        const d = input.toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  const recentActivity = props
    .map(p => {
      const created = toDateSafe((p as any).createdAt);
      const updated = toDateSafe((p as any).updatedAt);
      const latest = updated && (!created || updated >= created) ? updated : created;
      const type = updated && created ? (updated >= created ? 'updated' : 'added') : (updated ? 'updated' : 'added');
      return latest ? { prop: p, type, date: latest } : null;
    })
    .filter((x): x is { prop: Prop; type: 'added' | 'updated'; date: Date } => Boolean(x))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 4);

  // Urgent tasks
  const now = new Date();
  const tasksWithDue = cards
    .filter(card => card.dueDate && !card.completed)
    .map(card => ({
      ...card,
      due: card.dueDate ? new Date(card.dueDate) : new Date()
    }))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, 6);

  // Cards assigned to or mentioning the current user
  const assignedOrMentionedCards = cards.filter(card => {
    if (!user) return false;
    const assigned = Array.isArray(card.assignedTo) && card.assignedTo.includes((user as any).uid);
    const mention = (userProfile && card.description && (
      (userProfile.displayName && card.description.includes(userProfile.displayName)) ||
      (userProfile.email && card.description.includes(userProfile.email))
    ));
    return assigned || Boolean(mention);
  });

  function getTaskColor(due: Date) {
    if (due < now) return 'bg-red-600 text-white';
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 2) return 'bg-orange-500 text-white';
    return 'bg-green-600 text-white';
  }

  function isValidDateString(val: unknown): val is string {
    return typeof val === 'string' && (val as string).trim() !== '';
  }

  // Days until first performance
  let daysLeft: number | null = null;
  let perfDate: Date | null = null;
  const perfRaw = (show as any)?.firstPerformanceDate || (show as any)?.startDate;
  const tempPerf = perfRaw as any;
  if (typeof tempPerf === 'string' && tempPerf.trim() !== '') {
    perfDate = new Date(tempPerf);
  } else if (typeof tempPerf === 'number' && !isNaN(tempPerf)) {
    perfDate = new Date(tempPerf);
  } else if (tempPerf && typeof tempPerf.toDate === 'function') {
    perfDate = tempPerf.toDate();
  }
  if (perfDate) {
    daysLeft = Math.max(0, Math.ceil((perfDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Find the next upcoming show date label
  let nextShowDateLabel = '';
  if (show) {
    const nowLocal = new Date();
    const dateFields = [
      { key: 'rehearsalStartDate', label: 'Rehearsal' },
      { key: 'techWeekStartDate', label: 'Tech Week' },
      { key: 'firstPerformanceDate', label: 'First Performance' },
      { key: 'pressNightDate', label: 'Press Night' },
      { key: 'startDate', label: 'Start' },
      { key: 'endDate', label: 'End' },
    ];
    const upcoming = dateFields
      .map(({ key, label }) => {
        const raw = (show as any)[key];
        let date: Date | null = null;
        const temp = raw as any;
        if (isValidDateString(temp) && temp !== undefined) {
          date = new Date(temp as string);
        } else if (typeof temp === 'number' && !isNaN(temp)) {
          date = new Date(temp);
        } else if (temp && typeof temp.toDate === 'function') {
          date = temp.toDate();
        }
        return date && date > nowLocal ? { date, label } : null;
      })
      .filter(Boolean) as { date: Date; label: string }[];
    if (upcoming.length > 0) {
      const soonest = upcoming.reduce((a, b) => (a.date < b.date ? a : b));
      if (soonest.date instanceof Date && !isNaN(soonest.date.getTime())) {
        nextShowDateLabel = `Next Show Date: ${soonest.label} – ${soonest.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      } else {
        nextShowDateLabel = `Next Show Date: ${soonest.label}`;
      }
    } else {
      nextShowDateLabel = 'No upcoming show dates';
    }
  }

  return (
    <>
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
                  {show?.name || 'Select a Show'}
                </h2>
                <p className="text-pb-light/80">{nextShowDateLabel}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{daysLeft !== null ? `${daysLeft} days` : '--'}</div>
                <div className="text-pb-light/80 text-sm">until first night</div>
              </div>
            </div>
            <div className="w-full bg-pb-light/20 rounded-full h-2">
              <motion.div
                className="bg-pb-success h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${showReadyPercent}%` }}
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
                { icon: Package2, label: 'Total Props', value: totalProps, color: 'bg-pb-blue' },
                { icon: Clock, label: 'Pending Tasks', value: totalOutstandingTasks, color: 'bg-pb-orange' },
                { icon: CheckCircle, label: 'Ready for Show', value: `${showReadyPercent}%`, color: 'bg-pb-success' },
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

            {/* Urgent Tasks Row */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-pb-primary" />
                <h3 className="text-lg font-semibold text-white">Urgent Tasks</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {tasksWithDue.length === 0 && <div className="text-pb-gray">No urgent tasks.</div>}
                {tasksWithDue.map((task) => (
                  <Link key={task.id} to={`/boards?cardId=${task.id}`} className="min-w-[220px]">
                    <div className={`p-4 rounded-xl shadow ${getTaskColor((task as any).due)}`}>
                      <div className="font-bold text-lg">{task.title}</div>
                      <div className="text-xs mb-1">Due: {(task as any).due.toLocaleString()}</div>
                      <div className="text-xs">{task.description}</div>
                      </div>
                  </Link>
                ))}
                    </div>
                  </motion.div>
            {user && assignedOrMentionedCards.length > 0 && (
              <motion.div variants={itemVariants}>
                <div className="flex items-center space-x-2 mb-4 mt-6">
                  <Star className="w-5 h-5 text-pb-accent" />
                  <h3 className="text-lg font-semibold text-white">Your Tasks</h3>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {assignedOrMentionedCards.map(card => (
                    <Link key={card.id} to={`/boards?cardId=${card.id}`} className="min-w-[220px]">
                      <div className="p-4 rounded-xl shadow bg-pb-primary/80 text-white">
                        <div className="font-bold text-lg">{card.title}</div>
                        {card.dueDate && <div className="text-xs mb-1">Due: {new Date(card.dueDate).toLocaleString()}</div>}
                        <div className="text-xs line-clamp-2">{card.description}</div>
                      </div>
                    </Link>
                ))}
              </div>
            </motion.div>
            )}
          </motion.div>

          {/* Recent Props Activity */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <div className="bg-pb-darker/50 backdrop-blur-sm rounded-2xl p-6 border border-pb-primary/20 h-full">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-pb-accent" />
                <h3 className="text-lg font-semibold text-white">Recent Props Activity</h3>
              </div>
              <div className="space-y-4">
                {recentActivity.length === 0 && <div className="text-pb-gray">No recent activity.</div>}
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-pb-primary/5 hover:bg-pb-primary/10 transition-colors"
                  >
                    <div className="w-8 h-8 bg-pb-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Crown className="w-4 h-4 text-pb-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{activity.prop.name}</p>
                      <p className="text-xs text-pb-gray">{activity.type === 'added' ? 'Prop added' : 'Prop updated'}</p>
                      <p className="text-xs text-pb-gray mt-1">{activity.date ? activity.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
    <OnboardingFlow
      isOpen={showOnboarding}
      onComplete={() => setShowOnboarding(false)}
    />
    </>
  );
};

export default DashboardHome; 