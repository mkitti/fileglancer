import {
  HiOutlineInformationCircle,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineX
} from 'react-icons/hi';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

export const NotificationIcon = ({ type }: { type: string }) => {
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

export const getNotificationStyles = (type: string) => {
  switch (type) {
    case 'warning':
      return {
        container: 'bg-warning-light border border-warning-dark',
        icon: 'text-warning',
        text: 'text-warning-foreground',
        close: 'text-warning hover:text-warning-foreground'
      };
    case 'success':
      return {
        container: 'bg-success-light border border-success-dark',
        icon: 'text-success',
        text: 'text-success-foreground',
        close: 'text-success hover:text-success-foreground'
      };
    case 'error':
      return {
        container: 'bg-error-light border border-error-dark',
        icon: 'text-error',
        text: 'text-error-foreground',
        close: 'text-error hover:text-error-foreground'
      };
    case 'info':
    default:
      return {
        container: 'bg-info-light border border-info-dark',
        icon: 'text-info',
        text: 'text-info-foreground',
        close: 'text-info hover:text-info-foreground'
      };
  }
};

export interface NotificationItemProps {
  notification: {
    id: number;
    type: string;
    title: string;
    message: string;
  };
  onDismiss?: (id: number) => void;
  showDismissButton?: boolean;
  className?: string;
  isDismissed?: boolean;
}

export const NotificationItem = ({
  notification,
  onDismiss,
  showDismissButton = true,
  className = '',
  isDismissed = false
}: NotificationItemProps) => {
  const styles = getNotificationStyles(notification.type);

  return (
    <div className={`flex items-start ${className}`}>
      <div className={`${styles.icon} flex-shrink-0 mr-3`}>
        <NotificationIcon type={notification.type} />
      </div>
      <div className={`${styles.text} flex-1 min-w-0`}>
        <div className="font-medium text-sm">{notification.title}</div>
        <div className="text-sm opacity-90 mt-1">{notification.message}</div>
      </div>
      {showDismissButton && onDismiss && (
        <button
          onClick={() => onDismiss(notification.id)}
          className={`${styles.close} flex-shrink-0 ml-3 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors`}
          aria-label="Dismiss notification"
        >
          <HiOutlineX className="h-4 w-4" />
        </button>
      )}
      {isDismissed && (
        <div className="flex-shrink-0 ml-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          Dismissed
        </div>
      )}
    </div>
  );
};
