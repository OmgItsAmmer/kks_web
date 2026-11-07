/**
 * Remembers whether any checkout may be holding stock, so the 30-minute "release expired reservations" job
 * can return instantly without touching the database (and so without waking the sleeping Neon compute)
 * when nobody has checked out. It starts as "maybe" after every restart, so one check always happens.
 */
let pending = true;

export const markReservationsPending = (): void => {
  pending = true;
};
export const reservationsMayExist = (): boolean => pending;
export const markReservationsClear = (): void => {
  pending = false;
};
