import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

/**
 * Configure Passport.js for Enterprise Authentication
 */
export function configurePassport() {
  // Serialize user ID to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });
      if (!user) {
        return done(null, false);
      }
      // Omit password from session object
      const { password, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error, null);
    }
  });

  // 1. Local Strategy (Username/Password)
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          
          if (!user) {
            return done(null, false, { message: 'Invalid credentials' });
          }

          if (!user.isActive) {
            return done(null, false, { message: 'Account is disabled' });
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: 'Invalid credentials' });
          }

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // 2. Google OAuth Strategy (SSO)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback'
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            // Check if user exists by email
            const email = profile.emails?.[0]?.value;
            if (!email) return done(null, false, { message: 'No email found from Google' });

            let user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
              // Auto-provision user if they don't exist
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName,
                  password: 'sso_user_no_password', // Placeholder password for SSO
                  avatar: 'default',
                  storeId: 'store-001',
                  isActive: true
                }
              });
            } else {
              // Update last login
              user = await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // 3. Microsoft OAuth Strategy (SSO)
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    passport.use(
      new MicrosoftStrategy(
        {
          clientID: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          callbackURL: '/api/auth/microsoft/callback',
          scope: ['user.read']
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            // Check if user exists by email
            const email = profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName;
            if (!email) return done(null, false, { message: 'No email found from Microsoft' });

            let user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
              // Auto-provision user if they don't exist
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName || 'Microsoft User',
                  password: 'sso_user_no_password', // Placeholder password for SSO
                  avatar: 'default',
                  storeId: 'store-001',
                  isActive: true
                }
              });
            } else {
              // Update last login
              user = await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }
}
