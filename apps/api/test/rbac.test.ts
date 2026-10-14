import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_rbac_db';

let studentToken: string;
let directorToken: string;
let adminToken: string;

beforeAll(async () => {
  await connectDB(TEST_DB_URI);
  await User.deleteMany({});

  // 1. Create Student (Public registration)
  const studentRes = await request(app).post('/api/v1/auth/register').send({
    email: 'student_rbac@example.com',
    password: 'Password123!',
    displayName: 'Student RBAC',
    requestedRole: 'student',
  });
  studentToken = studentRes.body.data.token;

  // 2. Create Director (Authorized via administrative invite token)
  const directorRes = await request(app).post('/api/v1/auth/register').send({
    email: 'director_rbac@example.com',
    password: 'Password123!',
    displayName: 'Director RBAC',
    requestedRole: 'director',
    adminInviteToken: 'pdi_admin_invite_secret_dev',
  });
  directorToken = directorRes.body.data.token;

  // 3. Create Admin (Authorized via administrative invite token)
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    email: 'admin_rbac@example.com',
    password: 'Password123!',
    displayName: 'Admin RBAC',
    requestedRole: 'admin',
    adminInviteToken: 'pdi_admin_invite_secret_dev',
  });
  adminToken = adminRes.body.data.token;
});

afterAll(async () => {
  await User.deleteMany({});
  await disconnectDB();
});

describe('Role-Based Access Control (RBAC) Enforcement', () => {
  describe('Public / Unauthenticated Access', () => {
    it('allows unauthenticated access to health and rank rules', async () => {
      const healthRes = await request(app).get('/api/v1/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.status).toBe('healthy');

      const ranksRes = await request(app).get('/api/v1/ranks');
      expect(ranksRes.status).toBe(200);
      expect(ranksRes.body.data.ranks.S.minPoints).toBe(25000);
    });

    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/overview-summary');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Student Authorization Boundaries', () => {
    it('allows student to access student dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/student/dashboard-summary')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('student');
    });

    it('denies student access to director workspace with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/director/workspace-summary')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('denies student access to admin overview with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview-summary')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Casting Director Authorization Boundaries', () => {
    it('allows director to access director workspace', async () => {
      const res = await request(app)
        .get('/api/v1/director/workspace-summary')
        .set('Authorization', `Bearer ${directorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('director');
    });

    it('denies director access to admin overview with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview-summary')
        .set('Authorization', `Bearer ${directorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Admin Authorization Privileges', () => {
    it('allows admin to access admin overview and system configuration', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview-summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('admin');
      expect(res.body.data.awardsCatalog).toBeDefined();
    });
  });
});
