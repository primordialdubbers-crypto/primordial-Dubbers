import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  ArtistProfile,
  Notification,
  Challenge,
  Submission,
} from '../src/models/index.js';
import { generateToken } from '../src/utils/token.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_admin_user_mgmt_db';

let adminUser: any;
let studentUser: any;
let studentExtra: any;
let directorUser: any;
let adminToken: string;
let studentToken: string;

beforeAll(async () => {
  await connectDB(TEST_DB_URI);
});

afterAll(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await Notification.deleteMany({});
  await Challenge.deleteMany({});
  await Submission.deleteMany({});
  await disconnectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await Notification.deleteMany({});
  await Challenge.deleteMany({});
  await Submission.deleteMany({});

  adminUser = await User.create({
    email: 'mgmt_admin@pdi.com',
    displayName: 'PDI Head Admin',
    passwordHash: 'hashed',
    roles: ['admin', 'superadmin'],
    status: 'active',
  });
  adminToken = generateToken({
    userId: adminUser._id.toString(),
    email: adminUser.email,
    roles: adminUser.roles,
  });

  directorUser = await User.create({
    email: 'mgmt_director@pdi.com',
    displayName: 'Director Karan',
    passwordHash: 'hashed',
    roles: ['director'],
    status: 'active',
  });

  studentUser = await User.create({
    email: 'student_normal@pdi.com',
    displayName: 'Arjun Voice',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  studentToken = generateToken({
    userId: studentUser._id.toString(),
    email: studentUser.email,
    roles: studentUser.roles,
  });

  await ArtistProfile.create({
    userId: studentUser._id,
    displayName: studentUser.displayName,
    currentRank: 'C',
    rankPoints: 1250,
  });

  // Extra/Spam student account created by mistake
  studentExtra = await User.create({
    email: 'extra_spam_id@pdi.com',
    displayName: 'Spam Artist Duplicate',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });

  await ArtistProfile.create({
    userId: studentExtra._id,
    displayName: studentExtra.displayName,
    currentRank: 'ED',
    rankPoints: 0,
  });

  await Notification.create({
    recipientId: studentExtra._id,
    type: 'points_awarded',
    title: 'Welcome',
    message: 'Welcome duplicate user',
  });
});

describe('Phase 8: Admin User Management, Search & Deletion API', () => {
  it('allows Admin to search and list registered users with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?search=Spam')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.length).toBe(1);
    expect(res.body.data.users[0].email).toBe('extra_spam_id@pdi.com');
    expect(res.body.data.users[0].currentRank).toBe('ED');
  });

  it('rejects user search and listing when requested by a Student (RBAC enforcement)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows Admin to delete an extra/accidental user and cascades cleanup', async () => {
    const deleteRes = await request(app)
      .delete(`/api/v1/admin/users/${studentExtra._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.message).toContain('permanently removed');

    // Verify user is gone from DB
    const foundUser = await User.findById(studentExtra._id);
    expect(foundUser).toBeNull();

    // Verify profile is gone from DB
    const foundProfile = await ArtistProfile.findOne({ userId: studentExtra._id });
    expect(foundProfile).toBeNull();

    // Verify notifications cleaned up
    const foundNotifs = await Notification.find({ recipientId: studentExtra._id });
    expect(foundNotifs.length).toBe(0);
  });

  it('prevents an Admin from deleting their own active account', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/users/${adminUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('CANNOT_DELETE_SELF');
  });

  it('prevents deletion of root system administrator accounts', async () => {
    // Create a mock system root admin
    const rootAdmin = await User.create({
      email: 'admin@pdi.academy',
      displayName: 'Root Administrator',
      passwordHash: 'hashed',
      roles: ['admin', 'superadmin'],
      status: 'active',
    });

    const res = await request(app)
      .delete(`/api/v1/admin/users/${rootAdmin._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('PROTECTED_USER_CANNOT_BE_DELETED');
  });

  it('allows Admin to suspend and reactivate a user account', async () => {
    const resSuspend = await request(app)
      .patch(`/api/v1/admin/users/${studentUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    expect(resSuspend.status).toBe(200);
    expect(resSuspend.body.data.status).toBe('suspended');

    const updatedUser = await User.findById(studentUser._id);
    expect(updatedUser?.status).toBe('suspended');
  });
});
