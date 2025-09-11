import { Card, Typography } from '@material-tailwind/react';
import { HiOutlineInformationCircle } from 'react-icons/hi';
import { useNotificationContext } from '@/contexts/NotificationsContext';
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
    return (
      <div className="p-4">
        <Typography type="h5" className="text-foreground font-bold mb-6">
          Notifications
        </Typography>
        <div className="text-center py-8">
          <Typography className="text-muted-foreground">
            Loading notifications...
          </Typography>
        </div>
      </div>
    );
  }

  if (error) {
    logger.error('Notification error:', error);
    return (
      <div className="p-4">
        <Typography type="h5" className="text-foreground font-bold mb-6">
          Notifications
        </Typography>
        <Card className="p-6">
          <Typography className="text-error">
            Failed to load notifications. Please try refreshing the page.
          </Typography>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <Typography type="h5" className="text-foreground font-bold">
          Notifications ({notifications.length})
        </Typography>
      </div>

      {notifications.length > 0 && (
        <div className="mb-8">
          <div className="space-y-3">
            {notifications.map(notification => {
              const styles = getNotificationStyles(notification.type);
              const isClientDismissed = dismissedNotifications.includes(
                notification.id
              );
              const isInactive = !notification.active;
              const isDismissed = isClientDismissed || isInactive;

              return (
                <Card
                  key={notification.id}
                  className={`${styles.container} p-4 ${isDismissed ? 'opacity-60' : ''}`}
                >
                  <NotificationItem
                    notification={notification}
                    onDismiss={dismissNotification}
                    showDismissButton={
                      notification.active && !isClientDismissed
                    }
                    isDismissed={isDismissed}
                  />
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {notifications.length === 0 && (
        <Card className="p-8 text-center">
          <HiOutlineInformationCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <Typography type="h6" className="text-foreground mb-2">
            No notifications
          </Typography>
          <Typography className="text-muted-foreground">
            You don't have any notifications at the moment.
          </Typography>
        </Card>
      )}
    </div>
  );
}
