import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { Banner, Toast, Frame } from '@shopify/polaris';
import { CheckIcon, AlertDiamondIcon, InfoIcon } from '@shopify/polaris-icons';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onAction: () => void;
  };
  dismissible?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  showSuccess: (title: string, message?: string, options?: Partial<Notification>) => string;
  showError: (title: string, message?: string, options?: Partial<Notification>) => string;
  showWarning: (title: string, message?: string, options?: Partial<Notification>) => string;
  showInfo: (title: string, message?: string, options?: Partial<Notification>) => string;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
}

export function NotificationProvider({ 
  children, 
  maxNotifications = 5 
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addNotification = useCallback((
    notification: Omit<Notification, 'id'>
  ): string => {
    const id = generateId();
    const newNotification: Notification = {
      id,
      duration: 5000,
      dismissible: true,
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Limit number of notifications
      return updated.slice(0, maxNotifications);
    });

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [generateId, maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<Notification>
  ) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<Notification>
  ) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 0, // Errors don't auto-dismiss
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<Notification>
  ) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration: 8000, // Warnings stay longer
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<Notification>
  ) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationRenderer notifications={notifications} onDismiss={removeNotification} />
    </NotificationContext.Provider>
  );
}

interface NotificationRendererProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

function NotificationRenderer({ notifications, onDismiss }: NotificationRendererProps) {
  // Show only the most recent notification as a Toast
  const latestNotification = notifications[0];

  if (!latestNotification) {
    return null;
  }

  const getTone = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'critical';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  };

  return (
    <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000 }}>
      <Frame>
        <Toast
          content={latestNotification.message || latestNotification.title}
          onDismiss={() => onDismiss(latestNotification.id)}
          duration={latestNotification.duration}
          action={latestNotification.action}
        />
      </Frame>
    </div>
  );
}

interface NotificationBannerProps {
  type: NotificationType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onAction: () => void;
  };
  onDismiss?: () => void;
  dismissible?: boolean;
}

export function NotificationBanner({
  type,
  title,
  message,
  action,
  onDismiss,
  dismissible = true
}: NotificationBannerProps) {
  const getTone = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'critical';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return CheckIcon;
      case 'error': return AlertDiamondIcon;
      case 'warning': return AlertDiamondIcon;
      case 'info': return InfoIcon;
      default: return InfoIcon;
    }
  };

  return (
    <Banner
      title={title}
      tone={getTone(type)}
      icon={getIcon(type)}
      action={action}
      onDismiss={dismissible ? onDismiss : undefined}
    >
      {message && <p>{message}</p>}
    </Banner>
  );
}

// Predefined notification creators for common scenarios
export const notifications = {
  extractionStarted: (source: string) => ({
    type: 'info' as NotificationType,
    title: 'Extraction started',
    message: `Processing ${source} content with AI...`
  }),

  extractionSuccess: (itemCount: number) => ({
    type: 'success' as NotificationType,
    title: 'Content extracted successfully',
    message: `Found ${itemCount} items to add to your product`
  }),

  extractionError: (error: string) => ({
    type: 'error' as NotificationType,
    title: 'Extraction failed',
    message: error
  }),

  saveSuccess: (productTitle: string) => ({
    type: 'success' as NotificationType,
    title: 'Content saved',
    message: `Product "${productTitle}" has been updated`
  }),

  saveError: (error: string) => ({
    type: 'error' as NotificationType,
    title: 'Save failed',
    message: error
  }),

  validationError: (field: string, error: string) => ({
    type: 'warning' as NotificationType,
    title: 'Validation error',
    message: `${field}: ${error}`
  }),

  networkError: () => ({
    type: 'error' as NotificationType,
    title: 'Network error',
    message: 'Check your internet connection and try again'
  }),

  rateLimitError: () => ({
    type: 'warning' as NotificationType,
    title: 'Rate limit reached',
    message: 'Please wait a moment before trying again',
    duration: 10000
  }),

  uploadProgress: (progress: number) => ({
    type: 'info' as NotificationType,
    title: 'Uploading file',
    message: `${Math.round(progress)}% complete`,
    duration: 1000
  }),

  batchComplete: (successful: number, total: number) => ({
    type: successful === total ? 'success' as NotificationType : 'warning' as NotificationType,
    title: 'Batch operation complete',
    message: `${successful} of ${total} items processed successfully`
  })
};

// Hook for quick notification access with common patterns
export function useProductBridgeNotifications() {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();

  return {
    notifyExtractionStarted: (source: string) => 
      showInfo(notifications.extractionStarted(source).title, notifications.extractionStarted(source).message),

    notifyExtractionSuccess: (itemCount: number) => 
      showSuccess(notifications.extractionSuccess(itemCount).title, notifications.extractionSuccess(itemCount).message),

    notifyExtractionError: (error: string) => 
      showError(notifications.extractionError(error).title, notifications.extractionError(error).message),

    notifySaveSuccess: (productTitle: string) => 
      showSuccess(notifications.saveSuccess(productTitle).title, notifications.saveSuccess(productTitle).message),

    notifySaveError: (error: string) => 
      showError(notifications.saveError(error).title, notifications.saveError(error).message),

    notifyValidationError: (field: string, error: string) => 
      showWarning(notifications.validationError(field, error).title, notifications.validationError(field, error).message),

    notifyNetworkError: () => 
      showError(notifications.networkError().title, notifications.networkError().message),

    notifyRateLimitError: () => 
      showWarning(notifications.rateLimitError().title, notifications.rateLimitError().message, { duration: 10000 }),

    notifyBatchComplete: (successful: number, total: number) => {
      const notification = notifications.batchComplete(successful, total);
      if (notification.type === 'success') {
        showSuccess(notification.title, notification.message);
      } else {
        showWarning(notification.title, notification.message);
      }
    }
  };
}