import { createDatabase } from './seed';

/** The mock backend's data. It lives in memory and resets on reload; a real API replaces this module. */
export const db = createDatabase();
