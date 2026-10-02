import { logger } from 'firebase-functions';

/** cybrdeck-website's `dbg`, routed to Cloud Logging. */
export const dbg = (...args: unknown[]): void => logger.debug(args.map(String).join(' '));
