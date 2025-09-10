import {
  HiOutlineInformationCircle,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineX
} from 'react-icons/hi';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { useNotificationContext } from '@/contexts/NotificationsContext';
import logger from '@/logger';

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
          'bg-warning-light dark:bg-warning-dark border border-warning-dark dark:border-warning',
        icon: 'text-warning',
        text: 'text-warning-dark dark:text-warning-light',
        close:
          'text-warning dark:text-warning-light hover:text-warning-dark dark:hover:text-warning-foreground'
      };
    case 'success':
      return {
        container:
          'bg-success-light dark:bg-success-dark border border-success-dark dark:border-success',
        icon: 'text-success',
        text: 'text-success-dark dark:text-success-light',
        close:
          'text-success dark:text-success-light hover:text-success-dark dark:hover:text-success-foreground'
      };
    case 'error':
      return {
        container:
          'bg-error-light dark:bg-error-dark border border-error-dark dark:border-error',
        icon: 'text-error',
        text: 'text-error-dark dark:text-error-light',
        close:
          'text-error dark:text-error-light hover:text-error-dark dark:hover:text-error-foreground'
      };
    case 'info':
    default:
      return {
        container:
          'bg-info-light dark:bg-info-dark border border-info-dark dark:border-info',
        icon: 'text-info',
        text: 'text-info-dark dark:text-info-light',
        close:
          'text-info dark:text-info-light hover:text-info-dark dark:hover:text-info-foreground'
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
