import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pdi_ranking_system',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_must_change_in_production_32chars',
  cookieSecret: process.env.COOKIE_SECRET || 'dev_cookie_secret_must_change_in_production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  adminInviteToken: process.env.ADMIN_INVITE_TOKEN || 'pdi_admin_invite_secret_dev',
  adminDefaultEmail: process.env.ADMIN_DEFAULT_EMAIL || 'admin@pdi.academy',
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456',
  isProd: process.env.NODE_ENV === 'production',
};
