import 'express-session';

declare module 'express-session' {
  interface SessionData {
    mfaPending?: boolean;
    tempMfaSecret?: string;
  }
}
