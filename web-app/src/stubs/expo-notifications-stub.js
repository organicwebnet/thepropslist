// Stub for expo-notifications (not available on web)
// Web apps should use browser notifications API instead

export default {
  setNotificationHandler: () => {},
  getPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
  requestPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
  getExpoPushTokenAsync: () => Promise.resolve({ data: '' }),
  scheduleNotificationAsync: () => Promise.resolve(''),
  cancelScheduledNotificationAsync: () => Promise.resolve(),
  cancelAllScheduledNotificationsAsync: () => Promise.resolve(),
  dismissNotificationAsync: () => Promise.resolve(),
  dismissAllNotificationsAsync: () => Promise.resolve(),
  getBadgeCountAsync: () => Promise.resolve(0),
  setBadgeCountAsync: () => Promise.resolve(),
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  removeNotificationSubscription: () => {},
  removeAllNotificationListeners: () => {},
};

export const setNotificationHandler = () => {};
export const getPermissionsAsync = () => Promise.resolve({ status: 'denied' });
export const requestPermissionsAsync = () => Promise.resolve({ status: 'denied' });
export const getExpoPushTokenAsync = () => Promise.resolve({ data: '' });
export const scheduleNotificationAsync = () => Promise.resolve('');
export const cancelScheduledNotificationAsync = () => Promise.resolve();
export const cancelAllScheduledNotificationsAsync = () => Promise.resolve();
export const dismissNotificationAsync = () => Promise.resolve();
export const dismissAllNotificationsAsync = () => Promise.resolve();
export const getBadgeCountAsync = () => Promise.resolve(0);
export const setBadgeCountAsync = () => Promise.resolve();
export const addNotificationReceivedListener = () => ({ remove: () => {} });
export const addNotificationResponseReceivedListener = () => ({ remove: () => {} });
export const removeNotificationSubscription = () => {};
export const removeAllNotificationListeners = () => {};



