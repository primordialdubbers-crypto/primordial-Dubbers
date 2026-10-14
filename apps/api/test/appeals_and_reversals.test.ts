import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  ArtistProfile,
  PointTransaction,
  PointProposal,
  RankEvent,
  Appeal,
} from '../src/models/index.js';
import { generateToken } from '../src/utils/token.js';
import { PointsService } from '../src/services/pointsService.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_appeals_db';

let adminUser: any;
let directorUser: any;
let studentUser: any;
let secondStudent: any;
let adminToken: string;
let directorToken: string;
let studentToken: string;
let secondStudentToken: string;

beforeAll(async () => {
  await connectDB(TEST_DB_URI);
});

afterAll(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await PointTransaction.deleteMany({});
  await PointProposal.deleteMany({});
  await RankEvent.deleteMany({});
  await Appeal.deleteMany({});
  await disconnectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await PointTransaction.deleteMany({});
  await PointProposal.deleteMany({});
  await RankEvent.deleteMany({});
  await Appeal.deleteMany({});

  adminUser = await User.create({
    email: 'admin_exec@pdi.com',
    displayName: 'PDI Executive Admin',
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
    email: 'director_casting@pdi.com',
    displayName: 'Lead Casting Director',
    passwordHash: 'hashed',
    roles: ['director'],
    status: 'active',
  });
  directorToken = generateToken({
    userId: directorUser._id.toString(),
    email: directorUser.email,
    roles: directorUser.roles,
  });

  studentUser = await User.create({
    email: 'student_pro@pdi.com',
    displayName: 'Rising Dubber',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  studentToken = generateToken({
    userId: studentUser._id.toString(),
    email: studentUser.email,
    roles: studentUser.roles,
  });

  secondStudent = await User.create({
    email: 'other_student@pdi.com',
    displayName: 'Other Student',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  secondStudentToken = generateToken({
    userId: secondStudent._id.toString(),
    email: secondStudent.email,
    roles: secondStudent.roles,
  });

  // Setup student at 5,040 points (Tier B)
  await ArtistProfile.create({
    userId: studentUser._id,
    displayName: studentUser.displayName,
    rankPoints: 5040,
    currentRank: 'B',
    publicOptIn: true,
  });
});

describe('Phase 3: Director Recommendations, Self-Proposal Guards & Appeals System', () => {
  it('guards against self-proposals when director attempts to recommend points for themselves', async () => {
    const res = await request(app)
      .post('/api/v1/director/point-proposals')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        studentId: directorUser._id.toString(),
        delta: 100,
        category: 'training',
        reason: 'Attempted self-recommendation of points',
        sourceType: 'manual_award',
        idempotencyKey: 'self_prop_director_001',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SELF_PROPOSAL_FORBIDDEN');
  });

  it('allows director to propose deduction and admin to approve it, causing rank demotion', async () => {
    // 1. Director proposes -100 deduction
    const propRes = await request(app)
      .post('/api/v1/director/point-proposals')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: -100,
        category: 'deduction_deadline',
        reason: 'Missed final episode studio mastering deadline',
        sourceType: 'manual_deduction',
        idempotencyKey: 'deduction_prop_demote_001',
      });

    expect(propRes.status).toBe(201);
    const proposalId = propRes.body.data.proposal.id;

    // 2. Admin filters proposals with pagination
    const listRes = await request(app)
      .get('/api/v1/admin/point-proposals?status=pending&page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.proposals.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data.pagination.total).toBeGreaterThanOrEqual(1);

    // 3. Admin approves proposal -> student demotes from B (5,040) to C (4,940)
    const approveRes = await request(app)
      .post(`/api/v1/admin/point-proposals/${proposalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decisionNote: 'Approved deduction per studio policy' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.balanceBefore).toBe(5040);
    expect(approveRes.body.data.balanceAfter).toBe(4940);
    expect(approveRes.body.data.oldRank).toBe('B');
    expect(approveRes.body.data.newRank).toBe('C');
    expect(approveRes.body.data.rankChanged).toBe(true);

    const profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.currentRank).toBe('C');
    expect(profile?.rankPoints).toBe(4940);
  });

  it('allows student to appeal deduction, rejects invalid appeal targets and duplicate appeals', async () => {
    // Create an approved deduction transaction (-100)
    const deductionMutation = await PointsService.applyPointMutation({
      studentId: studentUser._id.toString(),
      delta: -100,
      actorId: adminUser._id.toString(),
      reason: 'Audio clipping warning',
      category: 'deduction_audio',
      idempotencyKey: 'tx_audio_clip_001',
    });
    const deductionTxId = deductionMutation.transaction._id.toString();

    // Create an award transaction (+50)
    const awardMutation = await PointsService.applyPointMutation({
      studentId: studentUser._id.toString(),
      delta: 50,
      actorId: adminUser._id.toString(),
      reason: 'Training bonus',
      category: 'training',
      idempotencyKey: 'tx_training_bonus_001',
    });
    const awardTxId = awardMutation.transaction._id.toString();

    // Case 1: Attempting to appeal a credit/award (+50) must be rejected
    const creditAppealRes = await request(app)
      .post('/api/v1/me/appeals')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        transactionId: awardTxId,
        reason: 'I want to dispute this positive award transaction for some reason',
      });
    expect(creditAppealRes.status).toBe(400);
    expect(creditAppealRes.body.error.code).toBe('INVALID_APPEAL');

    // Case 2: Attempting to appeal someone else's transaction must be rejected
    const forbiddenRes = await request(app)
      .post('/api/v1/me/appeals')
      .set('Authorization', `Bearer ${secondStudentToken}`)
      .send({
        transactionId: deductionTxId,
        reason: 'This was not my fault, please revert the studio deduction',
      });
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN_TRANSACTION');

    // Case 3: Valid appeal submission by the affected student
    const validAppealRes = await request(app)
      .post('/api/v1/me/appeals')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        transactionId: deductionTxId,
        reason: 'The audio clipping occurred due to faulty studio patch panel, replaced in ticket #940',
        evidenceText: 'Attached maintenance log confirming interface gain anomaly during session',
      });

    expect(validAppealRes.status).toBe(201);
    expect(validAppealRes.body.data.appeal.status).toBe('pending');
    expect(validAppealRes.body.data.appeal.transactionId).toBe(deductionTxId);

    // Case 4: Duplicate appeal on the same transaction while pending must be rejected (409)
    const duplicateRes = await request(app)
      .post('/api/v1/me/appeals')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        transactionId: deductionTxId,
        reason: 'Second appeal attempt for the exact same deduction transaction',
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error.code).toBe('CONFLICT');
  });

  it('allows student to list their appeals and admin to list all appeals', async () => {
    // Setup deduction and appeal
    const mutation = await PointsService.applyPointMutation({
      studentId: studentUser._id.toString(),
      delta: -40,
      actorId: adminUser._id.toString(),
      reason: 'Incomplete dialogue take',
      category: 'deduction_dialogue',
      idempotencyKey: 'tx_dialogue_incomplete_001',
    });

    await request(app)
      .post('/api/v1/me/appeals')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        transactionId: mutation.transaction._id.toString(),
        reason: 'Director requested pickup lines which were submitted via email due to server error',
      });

    // Student queries their appeals
    const studentList = await request(app)
      .get('/api/v1/me/appeals')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentList.status).toBe(200);
    expect(studentList.body.data.appeals.length).toBe(1);
    expect(studentList.body.data.appeals[0].transactionDelta).toBe(-40);
    expect(studentList.body.data.appeals[0].status).toBe('pending');

    // Admin queries appeals queue
    const adminList = await request(app)
      .get('/api/v1/admin/appeals?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminList.status).toBe(200);
    expect(adminList.body.data.appeals.length).toBe(1);
    expect(adminList.body.data.appeals[0].studentName).toBe('Rising Dubber');
  });

  it('admin resolves appeal by granting it: creates additive inverse transaction, restores rank, never mutates past record', async () => {
    // 1. Initial balance: 5,040 (Rank B)
    // 2. Deduction applied: -100 -> new balance 4,940 (Rank C, Demoted)
    const deductionMutation = await PointsService.applyPointMutation({
      studentId: studentUser._id.toString(),
      delta: -100,
      actorId: adminUser._id.toString(),
      reason: 'Equipment hum penalty',
      category: 'deduction_audio',
      idempotencyKey: 'tx_equipment_hum_001',
    });
    const originalTxId = deductionMutation.transaction._id.toString();

    let profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.rankPoints).toBe(4940);
    expect(profile?.currentRank).toBe('C');

    // 3. Student submits appeal
    const appealRes = await request(app)
      .post('/api/v1/me/appeals')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        transactionId: originalTxId,
        reason: 'Studio engineer confirmed building grounding issue caused the 60Hz hum',
        evidenceText: 'Facility maintenance incident report #2203',
      });

    const appealId = appealRes.body.data.appeal.id;

    // 4. Admin grants appeal
    const resolveRes = await request(app)
      .post(`/api/v1/admin/appeals/${appealId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'grant',
        decisionNote: 'Evidence verified with studio engineering. Deduction reversed.',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.reversed).toBe(true);
    expect(resolveRes.body.data.transaction.delta).toBe(100); // Additive inverse: +100
    expect(resolveRes.body.data.transaction.balanceBefore).toBe(4940);
    expect(resolveRes.body.data.transaction.balanceAfter).toBe(5040);
    expect(resolveRes.body.data.transaction.newRank).toBe('B');
    expect(resolveRes.body.data.transaction.rankChanged).toBe(true); // Promoted back to B

    // 5. Verify database records
    // Past deduction record MUST remain intact and untouched
    const untouchedOriginal = await PointTransaction.findById(originalTxId);
    expect(untouchedOriginal?.delta).toBe(-100);
    expect(untouchedOriginal?.balanceAfter).toBe(4940);

    // New additive inverse transaction exists
    const reversalTx = await PointTransaction.findOne({ reversalOf: originalTxId });
    expect(reversalTx).not.toBeNull();
    expect(reversalTx?.delta).toBe(100);
    expect(reversalTx?.category).toBe('appeal_reversal');
    expect(reversalTx?.balanceAfter).toBe(5040);

    // Profile restored
    profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.rankPoints).toBe(5040);
    expect(profile?.currentRank).toBe('B');

    // Appeal marked as granted and linked
    const appealDoc = await Appeal.findById(appealId);
    expect(appealDoc?.status).toBe('granted');
    expect(appealDoc?.reversalTransactionId?.toString()).toBe(reversalTx?._id.toString());

    // 6. Repeated resolution attempt returns 409
    const repeatResolve = await request(app)
      .post(`/api/v1/admin/appeals/${appealId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'reject' });

    expect(repeatResolve.status).toBe(409);
    expect(repeatResolve.body.error.code).toBe('APPEAL_ALREADY_RESOLVED');
  });

  it('admin resolves appeal by rejecting it', async () => {
    const deductionMutation = await PointsService.applyPointMutation({
      studentId: studentUser._id.toString(),
      delta: -30,
      actorId: adminUser._id.toString(),
      reason: 'Unexcused absence from rehearsal',
      category: 'deduction_attendance',
      idempotencyKey: 'tx_absence_001',
    });

    const appealRes = await request(app)
      .post('/api/v1/me/appeals')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        transactionId: deductionMutation.transaction._id.toString(),
        reason: 'My alarm did not ring in the morning',
      });

    const appealId = appealRes.body.data.appeal.id;

    const resolveRes = await request(app)
      .post(`/api/v1/admin/appeals/${appealId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'reject',
        decisionNote: 'Unexcused personal schedule conflict does not qualify for deduction waiver',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.reversed).toBe(false);
    expect(resolveRes.body.data.appeal.status).toBe('rejected');

    const appealDoc = await Appeal.findById(appealId);
    expect(appealDoc?.status).toBe('rejected');
    expect(appealDoc?.decisionNote).toContain('Unexcused personal schedule');
  });

  it('safely handles search queries with regex special characters without throwing SyntaxError', async () => {
    // Propose point with regex characters in reason
    await request(app)
      .post('/api/v1/director/point-proposals')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 25,
        category: 'scene_mastery',
        reason: 'Mastery in [Act 1] (Dialogue + Emotion)',
        sourceType: 'manual_award',
        idempotencyKey: 'regex_test_prop_001',
      });

    // Test search with raw regex metacharacters: '[', '(', '+', '*'
    const res = await request(app)
      .get('/api/v1/admin/point-proposals?search=[Act%201]')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.proposals.length).toBeGreaterThanOrEqual(1);

    // Test search with another special regex character
    const res2 = await request(app)
      .get('/api/v1/admin/point-proposals?search=(Dialogue')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
  });
});

