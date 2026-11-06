/**
 * @file api-service/mock/db.ts
 * The in-memory database the mock modules read and write.
 */

import { createDatabase } from "@/api-service/mock/seed";

/** The mock backend's data. It lives in memory and resets on reload; a real API replaces this module. */
export const db = createDatabase();
