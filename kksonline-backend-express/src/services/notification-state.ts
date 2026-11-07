import { db } from '../config/database.config';

/**
 * Keeps "what is the newest notification, and how many are unread" in memory (plan 7.3).
 * The admin app asks every 30 seconds. Answering from memory means those polls never wake the
 * sleeping Neon database. Whoever creates or reads notifications calls `markNotificationsDirty()`;
 * the next poll then reloads one small row from the database. A 10 minute safety reload covers
 * changes made by another API instance.
 */
interface State {
  latestId: number;
  unread: number;
  loadedAt: number;
  dirty: boolean;
}

const MAX_AGE_MS = 10 * 60 * 1000;
const state: State = { latestId: 0, unread: 0, loadedAt: 0, dirty: true };

export const markNotificationsDirty = (): void => {
  state.dirty = true;
};

export const getNotificationState = async (): Promise<{ latestId: number; unread: number }> => {
  if (state.dirty || Date.now() - state.loadedAt > MAX_AGE_MS) {
    const [latest, unread] = await Promise.all([
      db.notification.findFirst({ orderBy: { notification_id: 'desc' }, select: { notification_id: true } }),
      db.notification.count({ where: { isRead: false } }),
    ]);
    state.latestId = latest?.notification_id ?? 0;
    state.unread = unread;
    state.loadedAt = Date.now();
    state.dirty = false;
  }
  return { latestId: state.latestId, unread: state.unread };
};
