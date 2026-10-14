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
} from '../src/models/index.js';
import { generateToken } from '../src/utils/token.js';
import { PointsService } from '../src/services/pointsService.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_points_ledger_db';

let adminUser: any;
let directorUser: any;
let studentUser: any;
let adminToken: string;
let directorToken: string;
let studentToken: string;

beforeAll(async () => {
  await connectDB(TEST_DB_URI);
});

afterAll(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await PointTransaction.deleteMany({});
  await PointProposal.deleteMany({});
  await RankEvent.deleteMany({});
  await disconnectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await PointTransaction.deleteMany({});
  await PointProposal.deleteMany({});
  await RankEvent.deleteMany({});

  adminUser = await User.create({
    email: 'admin@pdi.com',
    displayName: 'PDI Executive Admin',
    passwordHash: 'hashed',
    roles: ['admin'],
    status: 'active',
  });
  adminToken = generateToken({
    userId: adminUser._id.toString(),
    email: adminUser.email,
    roles: adminUser.roles,
  });

  directorUser = await User.create({
    email: 'director@pdi.com',
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
    email: 'student@pdi.com',
    displayName: 'Rising Star Student',
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
    rankPoints: 0,
    currentRank: 'ED',
    publicOptIn: true,
  });
});

describe('Phase 2: Points Ledger, Nonnegative Balance & Rank Engine', () => {
  it('applies an authoritative point mutation, updates balance, and records transaction in ledger', async () => {
    const res = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 150,
        reason: 'Exceptional Audition Performance',
        category: 'audition',
        idempotencyKey: 'tx_first_award_001',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.balanceBefore).toBe(0);
    expect(res.body.data.balanceAfter).toBe(150);
    expect(res.body.data.oldRank).toBe('ED');
    expect(res.body.data.newRank).toBe('ED');
    expect(res.body.data.rankChanged).toBe(false);

    // Verify DB persistence
    const profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.rankPoints).toBe(150);

    const tx = await PointTransaction.findOne({ idempotencyKey: 'tx_first_award_001' });
    expect(tx).not.toBeNull();
    expect(tx?.delta).toBe(150);
    expect(tx?.balanceAfter).toBe(150);
  });

  it('enforces idempotency key deduplication and does not double-credit', async () => {
    // 1st request
    const res1 = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 200,
        reason: 'Training Session Completed',
        category: 'training',
        idempotencyKey: 'idemp_key_training_100',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.data.balanceAfter).toBe(200);

    // 2nd request with EXACT SAME idempotency key
    const res2 = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 200,
        reason: 'Training Session Completed',
        category: 'training',
        idempotencyKey: 'idemp_key_training_100',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.wasIdempotent).toBe(true);
    expect(res2.body.data.balanceAfter).toBe(200);

    // Check that balance in DB is strictly 200, not 400
    const profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.rankPoints).toBe(200);

    // Check that only 1 transaction document was created
    const count = await PointTransaction.countDocuments({
      idempotencyKey: 'idemp_key_training_100',
    });
    expect(count).toBe(1);
  });

  it('promotes student rank from ED to C when crossing 1,000 threshold and logs RankEvent', async () => {
    // Setup balance at 950 (ED)
    await ArtistProfile.updateOne({ userId: studentUser._id }, { rankPoints: 950, currentRank: 'ED' });

    const res = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 100,
        reason: 'Scene mastery award',
        category: 'scene_mastery',
        idempotencyKey: 'promo_ed_to_c',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.balanceBefore).toBe(950);
    expect(res.body.data.balanceAfter).toBe(1050);
    expect(res.body.data.oldRank).toBe('ED');
    expect(res.body.data.newRank).toBe('C');
    expect(res.body.data.rankChanged).toBe(true);
    expect(res.body.data.rankEvent).toBeDefined();

    const rankEvent = await RankEvent.findOne({ studentId: studentUser._id });
    expect(rankEvent).not.toBeNull();
    expect(rankEvent?.oldRank).toBe('ED');
    expect(rankEvent?.newRank).toBe('C');
    expect(rankEvent?.pointsAtEvent).toBe(1050);
  });

  it('promotes student from C to B when crossing 5,000 threshold (+100 at 4,950)', async () => {
    // PRD acceptance criteria: "Approved +100 at 4,950 promotes C to B"
    await ArtistProfile.updateOne({ userId: studentUser._id }, { rankPoints: 4950, currentRank: 'C' });

    const res = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 100,
        reason: 'Role approved milestone',
        category: 'role_approved',
        idempotencyKey: 'promo_c_to_b',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.balanceBefore).toBe(4950);
    expect(res.body.data.balanceAfter).toBe(5050);
    expect(res.body.data.oldRank).toBe('C');
    expect(res.body.data.newRank).toBe('B');
    expect(res.body.data.rankChanged).toBe(true);

    const profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.currentRank).toBe('B');
    expect(profile?.rankPoints).toBe(5050);
  });

  it('promotes student from B to A at 12,000 and A to S at 25,000', async () => {
    await ArtistProfile.updateOne({ userId: studentUser._id }, { rankPoints: 11950, currentRank: 'B' });

    const resA = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 100,
        reason: 'Advanced tier achievement',
        category: 'milestone',
        idempotencyKey: 'promo_b_to_a',
      });

    expect(resA.body.data.newRank).toBe('A');
    expect(resA.body.data.balanceAfter).toBe(12050);

    // Now test A to S
    await ArtistProfile.updateOne({ userId: studentUser._id }, { rankPoints: 24950, currentRank: 'A' });

    const resS = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 100,
        reason: 'Elite S-Rank coronation',
        category: 'milestone',
        idempotencyKey: 'promo_a_to_s',
      });

    expect(resS.body.data.newRank).toBe('S');
    expect(resS.body.data.balanceAfter).toBe(25050);
  });

  it('demotes student rank on approved deduction crossing boundary (e.g. -100 at 5,040 demotes B to C)', async () => {
    // PRD acceptance criteria: "Approved -100 at 5,040 demotes B to C"
    await ArtistProfile.updateOne({ userId: studentUser._id }, { rankPoints: 5040, currentRank: 'B' });

    const res = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: -100,
        reason: 'Approved deduction for missed deadline and incomplete audio',
        category: 'deduction',
        idempotencyKey: 'demote_b_to_c',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.balanceBefore).toBe(5040);
    expect(res.body.data.balanceAfter).toBe(4940);
    expect(res.body.data.oldRank).toBe('B');
    expect(res.body.data.newRank).toBe('C');
    expect(res.body.data.rankChanged).toBe(true);

    const profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.currentRank).toBe('C');
    expect(profile?.rankPoints).toBe(4940);

    const rankEvent = await RankEvent.findOne({ studentId: studentUser._id });
    expect(rankEvent).not.toBeNull();
    expect(rankEvent?.oldRank).toBe('B');
    expect(rankEvent?.newRank).toBe('C');
    expect(rankEvent?.pointsAtEvent).toBe(4940);
  });

  it('enforces non-negative balance protection when deduction exceeds balance: max(0, oldBalance + delta)', async () => {
    // Student has 50 points. Deduction of -100 should clamp at 0, not -50.
    await ArtistProfile.updateOne({ userId: studentUser._id }, { rankPoints: 50, currentRank: 'ED' });

    const res = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: -100,
        reason: 'Penalty deduction exceeding current balance',
        category: 'deduction',
        idempotencyKey: 'clamp_to_zero_001',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.balanceBefore).toBe(50);
    expect(res.body.data.balanceAfter).toBe(0);
    expect(res.body.data.newRank).toBe('ED');

    const profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.rankPoints).toBe(0);

    const tx = await PointTransaction.findOne({ idempotencyKey: 'clamp_to_zero_001' });
    expect(tx?.balanceBefore).toBe(50);
    expect(tx?.balanceAfter).toBe(0);
    expect(tx?.delta).toBe(-100);
  });

  it('blocks unauthorized student from mutating points (RBAC check)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/points/adjust')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 1000,
        reason: 'Hacked points',
        category: 'hack',
        idempotencyKey: 'unauth_hack_01',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('supports director proposal creation and subsequent admin approval queue commit', async () => {
    // 1. Director creates point proposal
    const propRes = await request(app)
      .post('/api/v1/director/point-proposals')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 75,
        category: 'review_award',
        reason: 'Excellent emotional delivery in audition #4',
        sourceType: 'manual_award',
        idempotencyKey: 'director_proposal_75',
      });

    expect(propRes.status).toBe(201);
    expect(propRes.body.data.proposal.status).toBe('pending');
    expect(propRes.body.data.proposal.delta).toBe(75);

    const proposalId = propRes.body.data.proposal.id;

    // Verify balance is UNCHANGED prior to admin approval
    let profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.rankPoints).toBe(0);

    // 2. Admin inspects pending proposals queue
    const listRes = await request(app)
      .get('/api/v1/admin/point-proposals?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.proposals.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data.proposals[0].id).toBe(proposalId);

    // 3. Admin approves proposal
    const approveRes = await request(app)
      .post(`/api/v1/admin/point-proposals/${proposalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decisionNote: 'Approved by head director',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.balanceAfter).toBe(75);

    // Verify DB updated
    profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.rankPoints).toBe(75);

    const updatedProposal = await PointProposal.findById(proposalId);
    expect(updatedProposal?.status).toBe('approved');
    expect(updatedProposal?.decidedBy?.toString()).toBe(adminUser._id.toString());

    // 4. Repeated approval is rejected with 409 Conflict
    const repeatApprove = await request(app)
      .post(`/api/v1/admin/point-proposals/${proposalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(repeatApprove.status).toBe(409);
    expect(repeatApprove.body.error.code).toBe('PROPOSAL_ALREADY_DECIDED');
  });

  it('supports admin proposal rejection', async () => {
    const propRes = await request(app)
      .post('/api/v1/director/point-proposals')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: -50,
        category: 'audio_quality',
        reason: 'Proposed deduction for mic hum',
        sourceType: 'manual_deduction',
        idempotencyKey: 'director_proposal_reject_me',
      });

    const proposalId = propRes.body.data.proposal.id;

    const rejectRes = await request(app)
      .post(`/api/v1/admin/point-proposals/${proposalId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decisionNote: 'Mic hum was within acceptable studio tolerance for ED tier',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.proposal.status).toBe('rejected');

    const proposal = await PointProposal.findById(proposalId);
    expect(proposal?.status).toBe('rejected');
  });

  it('allows student to query their points ledger and rank history', async () => {
    // Award 2 transactions
    await PointsService.applyPointMutation({
      studentId: studentUser._id.toString(),
      delta: 120,
      actorId: adminUser._id.toString(),
      reason: 'First milestone',
      category: 'training',
      idempotencyKey: 'hist_tx_1',
    });

    await PointsService.applyPointMutation({
      studentId: studentUser._id.toString(),
      delta: 900,
      actorId: adminUser._id.toString(),
      reason: 'Large role award',
      category: 'role_approved',
      idempotencyKey: 'hist_tx_2',
    });

    const pointsRes = await request(app)
      .get('/api/v1/me/points')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(pointsRes.status).toBe(200);
    expect(pointsRes.body.data.currentPoints).toBe(1020);
    expect(pointsRes.body.data.currentRank).toBe('C');
    expect(pointsRes.body.data.nextRank).toBe('B');
    expect(pointsRes.body.data.pointsToNextRank).toBe(5000 - 1020);
    expect(pointsRes.body.data.transactions.length).toBe(2);

    const rankRes = await request(app)
      .get('/api/v1/me/rank-history')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(rankRes.status).toBe(200);
    expect(rankRes.body.data.rankEvents.length).toBe(1);
    expect(rankRes.body.data.rankEvents[0].oldRank).toBe('ED');
    expect(rankRes.body.data.rankEvents[0].newRank).toBe('C');
    // Verify triggeringTransactionId is a valid 24-char ObjectId hex string, NOT '[object Object]'
    expect(rankRes.body.data.rankEvents[0].triggeringTransactionId).not.toBe('[object Object]');
    expect(rankRes.body.data.rankEvents[0].triggeringTransactionId).toMatch(/^[0-9a-fA-F]{24}$/);
    expect(rankRes.body.data.rankEvents[0].details).toBeDefined();
    expect(rankRes.body.data.rankEvents[0].details.reason).toBe('Large role award');
  });

  it('rejects self-approval where requester or beneficiary attempts to approve their own proposal', async () => {
    // Case A: Requester tries to approve their own proposal
    const propRes = await request(app)
      .post('/api/v1/director/point-proposals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 80,
        category: 'training',
        reason: 'Admin proposed award',
        sourceType: 'manual_award',
        idempotencyKey: 'self_approve_prop_1',
      });

    const proposalId = propRes.body.data.proposal.id;

    const selfApproveRes = await request(app)
      .post(`/api/v1/admin/point-proposals/${proposalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(selfApproveRes.status).toBe(403);
    expect(selfApproveRes.body.error.code).toBe('SELF_APPROVAL_FORBIDDEN');
    expect(selfApproveRes.body.message).toContain('Requesters cannot approve their own point proposals');

    // Case B: Admin creates a proposal benefiting themselves as student, then tries to approve
    const propForSelf = await PointProposal.create({
      studentId: adminUser._id,
      delta: 100,
      category: 'training',
      reason: 'Self benefit proposal',
      sourceType: 'manual_award',
      requestedBy: directorUser._id,
      idempotencyKey: 'self_benefit_prop_2',
    });

    const selfBenefitRes = await request(app)
      .post(`/api/v1/admin/point-proposals/${propForSelf._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(selfBenefitRes.status).toBe(403);
    expect(selfBenefitRes.body.error.code).toBe('SELF_APPROVAL_FORBIDDEN');
    expect(selfBenefitRes.body.message).toContain('Administrators cannot approve point proposals for themselves');
  });

  it('handles concurrent proposal approval race conditions gracefully with atomic locks', async () => {
    const propRes = await request(app)
      .post('/api/v1/director/point-proposals')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        studentId: studentUser._id.toString(),
        delta: 200,
        category: 'scene_mastery',
        reason: 'Concurrent test proposal',
        sourceType: 'manual_award',
        idempotencyKey: 'concurrent_race_prop_1',
      });

    const proposalId = propRes.body.data.proposal.id;

    // Send two approvals simultaneously
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/v1/admin/point-proposals/${proposalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .post(`/api/v1/admin/point-proposals/${proposalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one should succeed (200) and the other should be rejected (409 Conflict)
    expect(statuses).toEqual([200, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.error.code).toBe('PROPOSAL_ALREADY_DECIDED');

    // Ensure student points only updated once (200 points, not 400)
    const profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.rankPoints).toBe(200);
  });
});

