import { create } from 'zustand';

interface NotificationState {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error';
  showNotification: (params: {
    title: string;
    message: string;
    type?: 'success' | 'error';
  }) => void;
  hideNotification: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  show: false,
  title: '',
  message: '',
  type: 'success',
  showNotification: ({ title, message, type = 'success' }) =>
    set({ show: true, title, message, type }),
  hideNotification: () => set({ show: false }),
}));
