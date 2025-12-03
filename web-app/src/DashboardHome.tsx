// import React from 'react'; // Not needed with new JSX transform
import DashboardLayout from './PropsBibleHomepage';
import { motion } from 'framer-motion';
import { Settings2 } from 'lucide-react';
import { useShowSelection } from './contexts/ShowSelectionContext';
import { useFirebase } from './contexts/FirebaseContext';
import { useEffect, useState } from 'react';
import type { Show } from './types/Show';
import type { Prop } from './types/props';
import type { CardData } from './types/taskManager';
import { Link } from 'react-router-dom';
import OnboardingFlow from './components/OnboardingFlow';
import { useWebAuth } from './contexts/WebAuthContext';
import SubscriptionResourcePanel from './components/SubscriptionResourcePanel';
import { WidgetGrid } from './components/DashboardWidgets/WidgetGrid';
import { MyTasksWidget } from './components/DashboardWidgets/MyTasksWidget';
import { TaskboardQuickLinksWidget } from './components/DashboardWidgets/TaskboardQuickLinksWidget';
import { PropsWithoutTasksWidget } from './components/DashboardWidgets/PropsWithoutTasksWidget';
import { TaskboardActivitySummaryWidget } from './components/DashboardWidgets/TaskboardActivitySummaryWidget';
import { UpcomingDeadlinesWidget } from './components/DashboardWidgets/UpcomingDeadlinesWidget';
import { CutPropsPackingWidget } from './components/DashboardWidgets/CutPropsPackingWidget';
import { PropsNeedingWorkWidget } from './components/DashboardWidgets/PropsNeedingWorkWidget';
import { ShoppingApprovalWidget } from './components/DashboardWidgets/ShoppingApprovalWidget';
import { NotificationsWidget } from './components/DashboardWidgets/NotificationsWidget';
import { DeliveryListWidget } from './components/DashboardWidgets/DeliveryListWidget';
import { WidgetSettingsModal } from './components/DashboardWidgets/WidgetSettingsModal';
import { useWidgetPreferences } from './hooks/useWidgetPreferences';

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
  // const _navigate = useNavigate(); // Not used in current implementation
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const { userProfile } = useWebAuth();
  const userRole = userProfile?.role || '';
  const { isWidgetEnabled, preferences } = useWidgetPreferences(userRole);

  useEffect(() => {
    // Show onboarding if user hasn't completed it
    console.log('DashboardHome: Checking onboarding status:', {
      userProfile: userProfile ? {
        uid: userProfile.uid,
        onboardingCompleted: userProfile.onboardingCompleted
      } : null
    });
    
    if (userProfile && !userProfile.onboardingCompleted) {
      console.log('DashboardHome: Showing onboarding - user has not completed it');
      setShowOnboarding(true);
    } else if (userProfile && userProfile.onboardingCompleted) {
      console.log('DashboardHome: Hiding onboarding - user has completed it');
      setShowOnboarding(false);
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
      data => setProps(data.map(doc => ({ ...doc.data, id: doc.id })) as any),
      () => setProps([]),
      {
        where: [['showId', '==', currentShowId]]
      }
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
                  },
                  error => console.error('Error listening to cards:', error)
                );
                unsubCards.push(unsub);
              });
            },
            error => console.error('Error listening to lists:', error)
          );
        });
      },
      error => console.error('Error listening to boards:', error)
    );
    return () => { if (unsubBoards) unsubBoards(); unsubCards.forEach(u => u && u()); };
  }, [service, currentShowId]);

  // Calculate stats for show banner
  const totalProps = props.length;
  const readyProps = props.filter(p => (p as any).status === 'with-stage-management').length;
  const showReadyPercent = totalProps > 0 ? Math.round((readyProps / totalProps) * 100) : 0;

  function isValidDateString(val: unknown): val is string {
    return typeof val === 'string' && (val as string).trim() !== '';
  }

  // Days until first performance
  const now = new Date();
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

  // Find the next upcoming show date label and check if any dates are set
  let nextShowDateLabel = '';
  let hasAnyDates = false;
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
    
    // Check if any dates are set (not just upcoming ones)
    hasAnyDates = dateFields.some(({ key }) => {
      const raw = (show as any)[key];
      const temp = raw as any;
      return (isValidDateString(temp) && temp !== undefined && temp.trim() !== '') ||
             (typeof temp === 'number' && !isNaN(temp)) ||
             (temp && typeof temp.toDate === 'function');
    });
    
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
        className="max-w-7xl mx-auto space-y-4 md:space-y-6 px-2 sm:px-4 md:px-0"
      >
        {/* Show Banner */}
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-r from-pb-primary to-pb-secondary rounded-2xl p-4 md:p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-pb-primary/20 to-pb-secondary/20 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 sm:gap-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {show?.name || 'Select a Show'}
                </h2>
                <p className="text-pb-light/80 text-sm sm:text-base">{nextShowDateLabel}</p>
                {/* Gentle prompt for missing show dates */}
                {show && !hasAnyDates && (
                  <div className="mt-3 p-3 bg-pb-light/10 rounded-lg border border-pb-light/20">
                    <p className="text-pb-light/90 text-sm">
                      💡 <strong>Tip:</strong> Add your show dates to see countdown timers and better track your production timeline. 
                      <Link 
                        to={`/shows/${show.id}/edit`} 
                        className="text-pb-primary hover:text-pb-secondary underline ml-1 font-medium"
                      >
                        Add dates now
                      </Link>
                    </p>
                  </div>
                )}
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <div className="text-2xl sm:text-3xl font-bold text-white">{daysLeft !== null ? `${daysLeft} days` : '--'}</div>
                <div className="text-pb-light/80 text-xs sm:text-sm">until first performance</div>
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

        {/* Widget Settings Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowWidgetSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pb-primary/20 hover:bg-pb-primary/30 border border-pb-primary/30 rounded-lg text-white transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            <span>Widget Settings</span>
          </button>
        </div>

        {/* Widget Grid */}
        <WidgetGrid>
          {/* Render widgets in the order from preferences.enabled */}
          {(preferences?.enabled || []).map((widgetId) => {
            switch (widgetId) {
              case 'my-tasks':
                return (
                  <MyTasksWidget
                    key={widgetId}
                    showId={currentShowId}
                    cards={cards}
                    userId={user?.uid}
                    userDisplayName={userProfile?.displayName}
                    userEmail={userProfile?.email}
                  />
                );
              case 'taskboard-quick-links':
                return (
                  <TaskboardQuickLinksWidget
                    key={widgetId}
                    showId={currentShowId}
                    cards={cards}
                  />
                );
              case 'upcoming-deadlines':
                return (
                  <UpcomingDeadlinesWidget
                    key={widgetId}
                    showId={currentShowId}
                    cards={cards}
                  />
                );
              case 'task-planning-assistant':
                return (
                  <PropsWithoutTasksWidget
                    key={widgetId}
                    showId={currentShowId}
                    props={props}
                    cards={cards}
                  />
                );
              case 'taskboard-activity-summary':
                return (
                  <TaskboardActivitySummaryWidget
                    key={widgetId}
                    showId={currentShowId}
                    cards={cards}
                  />
                );
              case 'cut-props-packing':
                return (
                  <CutPropsPackingWidget
                    key={widgetId}
                    showId={currentShowId}
                    props={props}
                  />
                );
              case 'delivery-list':
                return (
                  <DeliveryListWidget
                    key={widgetId}
                    showId={currentShowId}
                    props={props}
                  />
                );
              case 'props-needing-work':
                return (
                  <PropsNeedingWorkWidget
                    key={widgetId}
                    showId={currentShowId}
                    props={props}
                  />
                );
              case 'shopping-approval-needed':
                return (
                  <ShoppingApprovalWidget
                    key={widgetId}
                    showId={currentShowId}
                  />
                );
              case 'notifications':
                return (
                  <NotificationsWidget
                    key={widgetId}
                    showId={currentShowId}
                    userId={user?.uid}
                  />
                );
              default:
                return null;
            }
          })}

          {/* Subscription Resource Panel - keep this */}
          <SubscriptionResourcePanel />
        </WidgetGrid>

        {/* Empty State */}
        {!isWidgetEnabled('my-tasks') &&
          !isWidgetEnabled('taskboard-quick-links') &&
          !isWidgetEnabled('upcoming-deadlines') &&
          !isWidgetEnabled('task-planning-assistant') &&
          !isWidgetEnabled('taskboard-activity-summary') &&
          !isWidgetEnabled('cut-props-packing') &&
          !isWidgetEnabled('delivery-list') &&
          !isWidgetEnabled('props-needing-work') &&
          !isWidgetEnabled('shopping-approval-needed') &&
          !isWidgetEnabled('notifications') && (
            <motion.div
              variants={cardVariants}
              className="bg-pb-darker/50 backdrop-blur-sm rounded-2xl p-12 border border-pb-primary/20 text-center"
            >
              <p className="text-pb-gray mb-4">No widgets enabled</p>
              <button
                onClick={() => setShowWidgetSettings(true)}
                className="px-6 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors"
              >
                Configure Widgets
              </button>
            </motion.div>
          )}
      </motion.div>
    </DashboardLayout>
    <OnboardingFlow
      isOpen={showOnboarding}
      onComplete={() => setShowOnboarding(false)}
    />
    <WidgetSettingsModal
      isOpen={showWidgetSettings}
      onClose={() => setShowWidgetSettings(false)}
    />
    </>
  );
};

export default DashboardHome; 