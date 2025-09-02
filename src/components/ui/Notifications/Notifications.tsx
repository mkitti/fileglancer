import {
  HiOutlineInformationCircle,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineX
} from 'react-icons/hi';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { useNotificationContext } from '@/contexts/NotificationsContext';

const NotificationIcon = ({ type }: { type: string }) => {
  const iconClass = 'h-5 w-5';

  switch (type) {
    case 'warning':
      return <HiOutlineExclamationTriangle className={iconClass} />;
    case 'success':
      return <HiOutlineCheckCircle className={iconClass} />;
    case 'error':
      return <HiOutlineXCircle className={iconClass} />;
    case 'info':
    default:
      return <HiOutlineInformationCircle className={iconClass} />;
  }
};

const getNotificationStyles = (type: string) => {
  switch (type) {
    case 'warning':
      return {
        container:
          'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-400',
        text: 'text-amber-900 dark:text-amber-100',
        close:
          'text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200'
      };
    case 'success':
      return {
        container:
          'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800',
        icon: 'text-green-600 dark:text-green-400',
        text: 'text-green-900 dark:text-green-100',
        close:
          'text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200'
      };
    case 'error':
      return {
        container:
          'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        text: 'text-red-900 dark:text-red-100',
        close:
          'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200'
      };
    case 'info':
    default:
      return {
        container:
          'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800',
        icon: 'text-blue-600 dark:text-blue-400',
        text: 'text-blue-900 dark:text-blue-100',
        close:
          'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200'
      };
  }
};

export default function Notifications() {
  const {
    notifications,
    dismissedNotifications,
    loading,
    error,
    dismissNotification,
    restoreAllNotifications
  } = useNotificationContext();

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (error) {
    console.error('Notification error:', error);
    return null; // Don't show error to user, just log it
  }

  const visibleNotifications = notifications.filter(
    notification => !dismissedNotifications.includes(notification.id)
  );

  if (visibleNotifications.length === 0) {
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
            <div className="flex items-start">
              <div className={`${styles.icon} flex-shrink-0 mr-3`}>
                <NotificationIcon type={notification.type} />
              </div>
              <div className={`${styles.text} flex-1 min-w-0`}>
                <div className="font-medium text-sm">{notification.title}</div>
                <div className="text-sm opacity-90 mt-1">
                  {notification.message}
                </div>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className={`${styles.close} flex-shrink-0 ml-3 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors`}
                aria-label="Dismiss notification"
              >
                <HiOutlineX className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
      {dismissedNotifications.length > 0 && (
        <div className="mx-4 mb-2">
          <button
            onClick={restoreAllNotifications}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:underline"
          >
            Show {dismissedNotifications.length} dismissed notification
            {dismissedNotifications.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
