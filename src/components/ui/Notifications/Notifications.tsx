import { useNotificationContext } from '@/contexts/NotificationsContext';
import logger from '@/logger';
import {
  getNotificationStyles,
  NotificationItem
} from '@/components/ui/Notifications/NotificationItem';

export default function Notifications() {
  const {
    notifications,
    dismissedNotifications,
    loading,
    error,
    dismissNotification
  } = useNotificationContext();

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (error) {
    logger.error('Notification error:', error);
    return null; // Don't show error to user, just log it
  }

  const visibleNotifications = notifications.filter(
    notification => !dismissedNotifications.includes(notification.id)
  );

  if (
    visibleNotifications.length === 0 &&
    dismissedNotifications.length === 0
  ) {
    return null;
  }

  return (
    <div className="w-full mt-2">
      {visibleNotifications.map(notification => {
        const styles = getNotificationStyles(notification.type);
        return (
          <div
            key={notification.id}
            className={`${styles.container} rounded-lg p-4 mb-2 mx-4 relative shadow-sm`}
          >
            <NotificationItem
              notification={notification}
              onDismiss={dismissNotification}
              showDismissButton={true}
            />
          </div>
        );
      })}
    </div>
  );
}
