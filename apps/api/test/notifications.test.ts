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
  PointTransaction,
  Appeal,
} from '../src/models/index.js';
import { generateToken } from '../src/utils/token.js';
import { PointsService } from '../src/services/pointsService.js';
import { AppealService } from '../src/services/appealService.js';
import { EvaluationService } from '../src/services/evaluationService.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_notifications_db';

let studentUser: any;
let studentToken: string;
let otherStudentUser: any;
let otherStudentToken: string;
let directorUser: any;
let directorToken: string;
let adminUser: any;
let adminToken: string;

beforeAll(async () => {
  await connectDB(TEST_DB_URI);
});

afterAll(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await Notification.deleteMany({});
  await Challenge.deleteMany({});
  await Submission.deleteMany({});
  await PointTransaction.deleteMany({});
  await Appeal.deleteMany({});
  await disconnectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await Notification.deleteMany({});
  await Challenge.deleteMany({});
  await Submission.deleteMany({});
  await PointTransaction.deleteMany({});
  await Appeal.deleteMany({});

  studentUser = await User.create({
    email: 'student_notif@pdi.com',
    displayName: 'Student Notif',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  studentToken = generateToken({
    userId: studentUser._id.toString(),
    email: studentUser.email,
    roles: studentUser.roles,
  });

  otherStudentUser = await User.create({
    email: 'other_notif@pdi.com',
    displayName: 'Other Notif',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  otherStudentToken = generateToken({
    userId: otherStudentUser._id.toString(),
    email: otherStudentUser.email,
    roles: otherStudentUser.roles,
  });

  directorUser = await User.create({
    email: 'director_notif@pdi.com',
    displayName: 'Director Notif',
    passwordHash: 'hashed',
    roles: ['director'],
    status: 'active',
  });
  directorToken = generateToken({
    userId: directorUser._id.toString(),
    email: directorUser.email,
    roles: directorUser.roles,
  });

  adminUser = await User.create({
    email: 'admin_notif@pdi.com',
    displayName: 'Admin Notif',
    passwordHash: 'hashed',
    roles: ['admin'],
    status: 'active',
  });
  adminToken = generateToken({
    userId: adminUser._id.toString(),
    email: adminUser.email,
    roles: adminUser.roles,
  });

  await ArtistProfile.create({
    userId: studentUser._id,
    displayName: studentUser.displayName,
    rankPoints: 500,
    currentRank: 'ED',
    publicOptIn: true,
  });
});

describe('Phase 7: In-App Notifications System API', () => {
  it('rejects unauthenticated requests to notifications endpoints with 401', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fetches empty notification list and 0 unread count for user without notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toHaveLength(0);
    expect(res.body.data.unreadCount).toBe(0);
  });

  it('retrieves notifications in reverse chronological order and accurate unread count', async () => {
    // Seed 2 notifications for student
    await Notification.create({
      recipientId: studentUser._id,
      title: 'First Notification',
      message: 'Older message',
      type: 'system',
      read: true,
      createdAt: new Date(Date.now() - 5000),
    });

    await Notification.create({
      recipientId: studentUser._id,
      title: 'Second Notification',
      message: 'Newer unread message',
      type: 'points_awarded',
      read: false,
      createdAt: new Date(),
    });

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(2);
    expect(res.body.data.unreadCount).toBe(1);
    expect(res.body.data.notifications[0].title).toBe('Second Notification');
    expect(res.body.data.notifications[0].read).toBe(false);
    expect(res.body.data.notifications[1].title).toBe('First Notification');
    expect(res.body.data.notifications[1].read).toBe(true);
  });

  it('marks a single notification as read', async () => {
    const notif = await Notification.create({
      recipientId: studentUser._id,
      title: 'Unread Alert',
      message: 'Please review',
      type: 'points_awarded',
      read: false,
    });

    const res = await request(app)
      .patch(`/api/v1/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notification.read).toBe(true);

    const check = await Notification.findById(notif._id);
    expect(check?.read).toBe(true);
  });

  it('prevents user from marking another user notification as read (returns 404)', async () => {
    const notif = await Notification.create({
      recipientId: otherStudentUser._id,
      title: 'Other User Alert',
      message: 'Private message',
      type: 'system',
      read: false,
    });

    const res = await request(app)
      .patch(`/api/v1/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${studentToken}`); // Attempt with studentToken, not otherStudentToken

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // Verify it remains unread
    const check = await Notification.findById(notif._id);
    expect(check?.read).toBe(false);
  });

  it('returns 400 when invalid notification ID format is provided', async () => {
    const res = await request(app)
      .patch('/api/v1/notifications/invalid-id-format/read')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_NOTIFICATION_ID');
  });

  it('marks all user notifications as read via POST /api/v1/notifications/read-all', async () => {
    await Notification.create([
      {
        recipientId: studentUser._id,
        title: 'Msg 1',
        message: 'Content 1',
        type: 'system',
        read: false,
      },
      {
        recipientId: studentUser._id,
        title: 'Msg 2',
        message: 'Content 2',
        type: 'points_awarded',
        read: false,
      },
    ]);

    const res = await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.modifiedCount).toBe(2);

    const countRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(countRes.body.data.unreadCount).toBe(0);
  });

  it('triggers points_awarded and rank_change notifications when points mutation crosses tier', async () => {
    // Current points: 500 (Rank ED)
    // Add 600 points -> 1100 points (Rank C)
    await PointsService.applyPointMutation({
      studentId: studentUser._id.toString(),
      delta: 600,
      actorId: adminUser._id.toString(),
      reason: 'Role performance excellence',
      category: 'review_award',
      idempotencyKey: 'tx_notif_cross_tier_1',
    });

    const notifs = await Notification.find({ recipientId: studentUser._id }).sort({ createdAt: 1 });
    expect(notifs.length).toBeGreaterThanOrEqual(2);

    const pointsNotif = notifs.find((n) => n.type === 'points_awarded');
    expect(pointsNotif).toBeDefined();
    expect(pointsNotif?.title).toBe('Points Awarded');
    expect(pointsNotif?.message).toContain('+600 PTS');

    const rankNotif = notifs.find((n) => n.type === 'rank_change');
    expect(rankNotif).toBeDefined();
    expect(rankNotif?.title).toBe('Rank Changed: C');
    expect(rankNotif?.message).toContain('advanced to Rank C');
  });

  it('triggers appeal_resolved notification when admin grants or rejects an appeal', async () => {
    // Create a deduction transaction
    const tx = await PointTransaction.create({
      studentId: studentUser._id,
      delta: -40,
      balanceBefore: 500,
      balanceAfter: 460,
      actorId: adminUser._id,
      reason: 'Missed dubbing call',
      category: 'DEADLINE_MISSED',
      idempotencyKey: 'tx_appeal_test_notif',
    });

    // Create student appeal
    const appeal = await AppealService.createAppeal({
      studentId: studentUser._id.toString(),
      transactionId: tx._id.toString(),
      reason: 'Had medical emergency with studio note',
    });

    // Admin grants appeal
    await AppealService.resolveAppeal({
      appealId: appeal._id.toString(),
      actorId: adminUser._id.toString(),
      decision: 'grant',
      decisionNote: 'Medical documentation verified by administration',
    });

    const appealNotif = await Notification.findOne({
      recipientId: studentUser._id,
      type: 'appeal_resolved',
    });

    expect(appealNotif).toBeDefined();
    expect(appealNotif?.title).toBe('Appeal Approved');
    expect(appealNotif?.message).toContain('40 PTS have been restored');
  });

  it('triggers evaluation_ready notification when director submits audition rubric evaluation', async () => {
    const challenge = await Challenge.create({
      title: 'Anime Hero Roar',
      description: 'Climactic shonen scream',
      characterName: 'Aoi',
      script: 'Never give up!',
      difficulty: 'Intermediate',
      targetRank: 'B',
      createdBy: directorUser._id,
    });

    const submission = await Submission.create({
      studentId: studentUser._id,
      challengeId: challenge._id,
      audioUrl: 'https://example.com/audio.ogg',
      durationSeconds: 15,
      mimeType: 'audio/ogg',
      submissionType: 'recorded',
      status: 'submitted',
    });

    // Director submits evaluation
    await EvaluationService.upsertEvaluation(
      {
        submissionId: submission._id.toString(),
        scores: {
          acting: 24,
          timing: 18,
          pronunciation: 18,
          expression: 18,
          audio: 14,
        },
        status: 'submitted',
        summaryNotes: 'Outstanding vocal projection',
      },
      directorUser._id.toString()
    );

    const evalNotif = await Notification.findOne({
      recipientId: studentUser._id,
      type: 'evaluation_ready',
    });

    expect(evalNotif).toBeDefined();
    expect(evalNotif?.title).toBe('Audition Evaluation Ready');
    expect(evalNotif?.message).toContain('Anime Hero Roar');
    expect(evalNotif?.message).toContain('92/100');
  });
});
