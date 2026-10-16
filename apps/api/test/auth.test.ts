import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'express';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { ArtistProfile } from '../src/models/ArtistProfile.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_auth_db';

beforeAll(async () => {
  await connectDB(TEST_DB_URI);
});

afterAll(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await disconnectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
});

describe('Authentication API (/api/v1/auth)', () => {
  it('registers a new student user and returns 201 with auth session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'student1@example.com',
        password: 'Password123!',
        displayName: 'John Student',
        requestedRole: 'student',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('student1@example.com');
    expect(res.body.data.user.roles).toContain('student');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.profile).toBeDefined();
    expect(res.body.data.profile.currentRank).toBe('ED');
    expect(res.body.data.profile.rankPoints).toBe(0);

    // Verify cookie set
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toContain('pdi_token');
  });

  it('rejects registration with invalid email or weak password', async () => {
    const badEmailRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'Password123',
        displayName: 'Invalid',
      });
    expect(badEmailRes.status).toBe(400);
    expect(badEmailRes.body.error.code).toBe('VALIDATION_ERROR');

    const shortPassRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'valid@example.com',
        password: 'short',
        displayName: 'Short Pass',
      });
    expect(shortPassRes.status).toBe(400);
  });

  it('rejects duplicate email registrations with 409 Conflict', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'dup@example.com',
      password: 'Password123!',
      displayName: 'First User',
    });

    const dupRes = await request(app).post('/api/v1/auth/register').send({
      email: 'dup@example.com',
      password: 'AnotherPassword123!',
      displayName: 'Duplicate Attempt',
    });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('logs in successfully with valid credentials and rejects bad passwords', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'login-test@example.com',
      password: 'Password123!',
      displayName: 'Login User',
    });

    const successRes = await request(app).post('/api/v1/auth/login').send({
      email: 'login-test@example.com',
      password: 'Password123!',
    });
    expect(successRes.status).toBe(200);
    expect(successRes.body.data.token).toBeDefined();

    const badPassRes = await request(app).post('/api/v1/auth/login').send({
      email: 'login-test@example.com',
      password: 'WrongPassword!',
    });
    expect(badPassRes.status).toBe(401);
    expect(badPassRes.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('allows authenticated users to query /api/v1/auth/me via Bearer token', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      email: 'bearer-test@example.com',
      password: 'Password123!',
      displayName: 'Bearer Tester',
    });
    const token = registerRes.body.data.token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('bearer-test@example.com');
  });

  it('clears session cookie on logout', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie[0]).toContain('pdi_token=;');
  });

  it('rejects unauthorized role escalation attempts without invite token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'hacker@example.com',
      password: 'Password123!',
      displayName: 'Unauthorized Admin Attempt',
      requestedRole: 'admin',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROLE_PROVISIONING_FORBIDDEN');
  });

  it('normalizes email casing and whitespace on registration and login', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      email: '  NormalUser@Example.COM  ',
      password: 'SecretPass123!',
      displayName: 'Normalized User',
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.user.email).toBe('normaluser@example.com');

    // Login with different casing and whitespace
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'NORMALUSER@EXAMPLE.COM',
      password: 'SecretPass123!',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.email).toBe('normaluser@example.com');

    // Logout session to free up device slot
    await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${loginRes.body.data.token}`);

    // Login using displayName as fallback
    const nameLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'Normalized User',
      password: 'SecretPass123!',
    });
    expect(nameLoginRes.status).toBe(200);
    expect(nameLoginRes.body.data.user.email).toBe('normaluser@example.com');
  });

  it('allows self-service password reset with valid email and new password', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'forgot@example.com',
      password: 'OldPassword123',
      displayName: 'Forgot User',
    });

    // Reset password
    const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
      email: 'FORGOT@example.com',
      newPassword: 'BrandNewPassword123',
    });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Old password should fail
    const oldLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'forgot@example.com',
      password: 'OldPassword123',
    });
    expect(oldLogin.status).toBe(401);

    // New password should succeed
    const newLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'forgot@example.com',
      password: 'BrandNewPassword123',
    });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.data.token).toBeDefined();
  });

  it('rejects password reset for non-existent email', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({
      email: 'nonexistent@example.com',
      newPassword: 'BrandNewPassword123',
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  describe('Concurrent Session Management (Max 2 Active Logins)', () => {
    const sessionEmail = 'multilogin@example.com';
    const sessionPass = 'SecurePass123!';

    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: sessionEmail,
        password: sessionPass,
        displayName: 'Multi Device User',
      });
      // Clear initial registration session to test login count cleanly
      await User.updateOne({ email: sessionEmail }, { $set: { activeSessions: [] } });
    });

    it('permits up to 2 active sessions and rejects a 3rd session with 429', async () => {
      // Session 1: Mobile device
      const res1 = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'PDI-Mobile-App/1.0')
        .send({ email: sessionEmail, password: sessionPass });
      expect(res1.status).toBe(200);
      const token1 = res1.body.data.token;

      // Session 2: Laptop browser
      const res2 = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Chrome-Desktop/120.0')
        .send({ email: sessionEmail, password: sessionPass });
      expect(res2.status).toBe(200);
      const token2 = res2.body.data.token;

      // Verify both sessions can access /api/v1/auth/me
      const me1 = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token1}`);
      expect(me1.status).toBe(200);

      const me2 = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token2}`);
      expect(me2.status).toBe(200);

      // Session 3: Attempting 3rd login from tablet without forceLogoutOthers
      const res3 = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'iPad-Safari/17.0')
        .send({ email: sessionEmail, password: sessionPass });

      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.error.code).toBe('ACTIVE_SESSION_LIMIT_EXCEEDED');
      expect(res3.body.error.maxAllowed).toBe(2);
      expect(res3.body.error.activeSessionsCount).toBe(2);

      // Verify earlier sessions are still active
      const stillMe1 = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token1}`);
      expect(stillMe1.status).toBe(200);
    });

    it('allows logging out other devices with forceLogoutOthers: true', async () => {
      // Establish 2 initial sessions
      const s1 = await request(app).post('/api/v1/auth/login').send({ email: sessionEmail, password: sessionPass });
      const token1 = s1.body.data.token;
      await request(app).post('/api/v1/auth/login').send({ email: sessionEmail, password: sessionPass });

      // 3rd login with forceLogoutOthers = true
      const forceRes = await request(app).post('/api/v1/auth/login').send({
        email: sessionEmail,
        password: sessionPass,
        forceLogoutOthers: true,
      });

      expect(forceRes.status).toBe(200);
      expect(forceRes.body.success).toBe(true);
      const newToken = forceRes.body.data.token;

      // Old session token1 should now be revoked (SESSION_TERMINATED)
      const oldCheck = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token1}`);
      expect(oldCheck.status).toBe(401);
      expect(oldCheck.body.error.code).toBe('SESSION_TERMINATED');

      // New token works
      const newCheck = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${newToken}`);
      expect(newCheck.status).toBe(200);
    });

    it('revokes session on explicit logout allowing subsequent login', async () => {
      // 2 sessions
      const s1 = await request(app).post('/api/v1/auth/login').send({ email: sessionEmail, password: sessionPass });
      const token1 = s1.body.data.token;
      await request(app).post('/api/v1/auth/login').send({ email: sessionEmail, password: sessionPass });

      // Logout device 1
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token1}`);
      expect(logoutRes.status).toBe(200);

      // Now a 3rd login can take device 1's freed spot without 429
      const s3 = await request(app).post('/api/v1/auth/login').send({ email: sessionEmail, password: sessionPass });
      expect(s3.status).toBe(200);
      expect(s3.body.data.token).toBeDefined();
    });
  });
});
