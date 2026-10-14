import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  ArtistProfile,
  Challenge,
  Submission,
  Evaluation,
  PointProposal,
} from '../src/models/index.js';
import { generateToken } from '../src/utils/token.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_evaluations_db';

let adminUser: any;
let directorUser: any;
let studentUser: any;
let otherStudentUser: any;
let adminToken: string;
let directorToken: string;
let studentToken: string;
let otherStudentToken: string;
let challenge: any;
let submission: any;

beforeAll(async () => {
  await connectDB(TEST_DB_URI);
});

afterAll(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await Challenge.deleteMany({});
  await Submission.deleteMany({});
  await Evaluation.deleteMany({});
  await PointProposal.deleteMany({});
  await disconnectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await Challenge.deleteMany({});
  await Submission.deleteMany({});
  await Evaluation.deleteMany({});
  await PointProposal.deleteMany({});

  adminUser = await User.create({
    email: 'admin_eval@pdi.com',
    displayName: 'PDI Eval Admin',
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
    email: 'director_eval@pdi.com',
    displayName: 'Director Marcus',
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
    email: 'student_eval@pdi.com',
    displayName: 'Anya Voice',
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
    currentRank: 'ED',
    rankPoints: 0,
  });

  otherStudentUser = await User.create({
    email: 'other_eval@pdi.com',
    displayName: 'Bob Actor',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  otherStudentToken = generateToken({
    userId: otherStudentUser._id.toString(),
    email: otherStudentUser.email,
    roles: otherStudentUser.roles,
  });
  await ArtistProfile.create({
    userId: otherStudentUser._id,
    displayName: otherStudentUser.displayName,
    currentRank: 'ED',
    rankPoints: 0,
  });

  challenge = await Challenge.create({
    title: 'Cyberpunk Detective Dialogue',
    description: 'Dramatic scene in neon-lit city rain',
    characterName: 'Detective Vance',
    script: 'The signal went cold three blocks back. Someone knew we were coming.',
    difficulty: 'Intermediate',
    targetRank: 'B',
    isActive: true,
    createdBy: adminUser._id,
  });

  submission = await Submission.create({
    studentId: studentUser._id,
    challengeId: challenge._id,
    audioUrl: 'https://storage.pdi.example.com/audio/take1.wav',
    durationSeconds: 14.5,
    mimeType: 'audio/wav',
    submissionType: 'recorded',
    status: 'submitted',
    notes: 'First take with deep gravelly resonance',
  });
});

describe('Phase 5: Director Evaluation Workspace & 100-Point Rubric API', () => {
  it('rejects rubric evaluation when scores exceed component maximums or are negative', async () => {
    // Acting max is 25, timing max 20, pronunciation max 20, expression max 20, audio max 15
    const invalidScores = [
      { acting: 26, timing: 20, pronunciation: 20, expression: 20, audio: 15 },
      { acting: 25, timing: 21, pronunciation: 20, expression: 20, audio: 15 },
      { acting: 25, timing: 20, pronunciation: 21, expression: 20, audio: 15 },
      { acting: 25, timing: 20, pronunciation: 20, expression: 21, audio: 15 },
      { acting: 25, timing: 20, pronunciation: 20, expression: 20, audio: 16 },
      { acting: -5, timing: 20, pronunciation: 20, expression: 20, audio: 15 },
    ];

    for (const scores of invalidScores) {
      const res = await request(app)
        .post('/api/v1/evaluations')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          submissionId: submission._id.toString(),
          scores,
          status: 'submitted',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('allows a director to save a draft evaluation and preserves submission submitted status', async () => {
    const draftRes = await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        submissionId: submission._id.toString(),
        scores: {
          acting: 22,
          timing: 18,
          pronunciation: 17,
          expression: 18,
          audio: 14,
        },
        timestampComments: [
          { timestampSeconds: 3.2, comment: 'Great pause before signal.' },
          { timestampSeconds: 9.5, comment: 'Slight plosive on blocks.' },
        ],
        summaryNotes: 'Promising performance. Needs breath work.',
        status: 'draft',
      });

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.success).toBe(true);
    expect(draftRes.body.data.evaluation.status).toBe('draft');
    expect(draftRes.body.data.evaluation.totalScore).toBe(89);
    expect(draftRes.body.data.evaluation.grade).toBe('A (Proficient)');
    expect(draftRes.body.data.evaluation.timestampComments).toHaveLength(2);

    // Submission should remain 'submitted' while in draft
    const subCheck = await Submission.findById(submission._id);
    expect(subCheck?.status).toBe('submitted');

    // Student cannot view draft evaluation
    const studentViewRes = await request(app)
      .get(`/api/v1/evaluations/submission/${submission._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentViewRes.status).toBe(404);
  });

  it('submits final evaluation, updates submission to reviewed, and attaches point proposal to admin queue', async () => {
    const submitRes = await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        submissionId: submission._id.toString(),
        scores: {
          acting: 25,
          timing: 20,
          pronunciation: 20,
          expression: 19,
          audio: 15,
        },
        timestampComments: [
          { timestampSeconds: 5.1, comment: 'Exceptional intensity and emotional grit.' },
        ],
        summaryNotes: 'Masterful read. Exceeded character expectations.',
        strengths: 'Rich timbre and authoritative tone.',
        areasForImprovement: 'Minor mic distance adjustment.',
        status: 'submitted',
        attachPointProposal: true,
        pointProposalDelta: 50,
        pointProposalCategory: 'scene_mastery',
        pointProposalReason: 'Scored 99/100 on Vance monologue challenge',
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    const evaluation = submitRes.body.data.evaluation;
    expect(evaluation.totalScore).toBe(99);
    expect(evaluation.grade).toBe('S (Exceptional)');
    expect(evaluation.status).toBe('submitted');
    expect(evaluation.pointProposalId).toBeTruthy();

    // Submission status should now be updated to 'reviewed'
    const subCheck = await Submission.findById(submission._id);
    expect(subCheck?.status).toBe('reviewed');

    // Point proposal must be created and pending in the Admin approval queue
    const proposal = await PointProposal.findById(evaluation.pointProposalId);
    expect(proposal).toBeTruthy();
    expect(proposal?.status).toBe('pending');
    expect(proposal?.delta).toBe(50);
    expect(proposal?.studentId.toString()).toBe(studentUser._id.toString());
    expect(proposal?.requestedBy.toString()).toBe(directorUser._id.toString());
    expect(proposal?.sourceType).toBe('review');

    // Locked PRD rule verification: Rubric evaluation DOES NOT grant points without approved proposal
    const profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.rankPoints).toBe(0);
    expect(profile?.currentRank).toBe('ED');

    // Student can now view their completed evaluation
    const studentViewRes = await request(app)
      .get(`/api/v1/evaluations/submission/${submission._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentViewRes.status).toBe(200);
    expect(studentViewRes.body.success).toBe(true);
    expect(studentViewRes.body.data.evaluation.totalScore).toBe(99);
    expect(studentViewRes.body.data.evaluation.scores.acting).toBe(25);
    expect(studentViewRes.body.data.evaluation.timestampComments[0].comment).toContain('Exceptional intensity');
  });

  it('enforces RBAC and privacy on evaluation endpoints', async () => {
    // 1. Submit evaluation as director
    await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        submissionId: submission._id.toString(),
        scores: { acting: 20, timing: 15, pronunciation: 18, expression: 17, audio: 14 },
        status: 'submitted',
      });

    // 2. Student cannot submit evaluation
    const studentSubmitRes = await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        submissionId: submission._id.toString(),
        scores: { acting: 20, timing: 15, pronunciation: 18, expression: 17, audio: 14 },
      });
    expect(studentSubmitRes.status).toBe(403);

    // 3. Different student cannot view someone elses evaluation
    const otherStudentViewRes = await request(app)
      .get(`/api/v1/evaluations/submission/${submission._id}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);
    expect(otherStudentViewRes.status).toBe(403);

    // 4. Student cannot access director review queue
    const queueStudentRes = await request(app)
      .get('/api/v1/director/review-queue')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(queueStudentRes.status).toBe(403);

    // 5. Director can view review queue with populated challenge and submission data
    const queueDirectorRes = await request(app)
      .get('/api/v1/director/review-queue')
      .set('Authorization', `Bearer ${directorToken}`);
    expect(queueDirectorRes.status).toBe(200);
    expect(queueDirectorRes.body.success).toBe(true);
    expect(queueDirectorRes.body.data.queue).toHaveLength(1);
    expect(queueDirectorRes.body.data.queue[0].challengeTitle).toBe('Cyberpunk Detective Dialogue');
    expect(queueDirectorRes.body.data.queue[0].evaluation).toBeTruthy();
  });

  it('persists syncOffsetMs hardware latency compensation and validates bounds', async () => {
    // 1. Valid positive latency offset (+150ms)
    const validRes = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        challengeId: challenge._id.toString(),
        audioUrl: 'https://storage.pdi.example.com/audio/take_offset.wav',
        durationSeconds: 12.0,
        mimeType: 'audio/wav',
        submissionType: 'recorded',
        syncOffsetMs: 150,
        notes: 'Take with +150ms mic delay calibrated',
      });

    expect(validRes.status).toBe(201);
    expect(validRes.body.data.submission.syncOffsetMs).toBe(150);

    const subId = validRes.body.data.submission.id;
    const dbSub = await Submission.findById(subId);
    expect(dbSub?.syncOffsetMs).toBe(150);

    // Verify it is surfaced in director review queue
    const queueRes = await request(app)
      .get('/api/v1/director/review-queue')
      .set('Authorization', `Bearer ${directorToken}`);
    const queueItem = queueRes.body.data.queue.find((q: any) => q.id === subId);
    expect(queueItem).toBeTruthy();
    expect(queueItem.syncOffsetMs).toBe(150);

    // 2. Reject syncOffsetMs out of bounds (> 500ms)
    const invalidHighRes = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        challengeId: challenge._id.toString(),
        audioUrl: 'https://storage.pdi.example.com/audio/take_bad.wav',
        durationSeconds: 10.0,
        mimeType: 'audio/wav',
        syncOffsetMs: 550,
      });
    expect(invalidHighRes.status).toBe(400);

    // 3. Reject syncOffsetMs out of bounds (< -500ms)
    const invalidLowRes = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        challengeId: challenge._id.toString(),
        audioUrl: 'https://storage.pdi.example.com/audio/take_bad2.wav',
        durationSeconds: 10.0,
        mimeType: 'audio/wav',
        syncOffsetMs: -600,
      });
    expect(invalidLowRes.status).toBe(400);
  });

  it('guarantees point proposal idempotency and prevents duplicate proposals on re-evaluation', async () => {
    // Submit evaluation with point proposal
    const firstRes = await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        submissionId: submission._id.toString(),
        scores: { acting: 24, timing: 19, pronunciation: 19, expression: 19, audio: 14 },
        status: 'submitted',
        attachPointProposal: true,
        pointProposalDelta: 50,
        pointProposalCategory: 'scene_mastery',
      });

    expect(firstRes.status).toBe(200);
    const firstPropId = firstRes.body.data.evaluation.pointProposalId;
    expect(firstPropId).toBeTruthy();

    // Re-submit evaluation for the same submission with point proposal (network retry / update)
    const retryRes = await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        submissionId: submission._id.toString(),
        scores: { acting: 24, timing: 19, pronunciation: 19, expression: 19, audio: 14 },
        status: 'submitted',
        attachPointProposal: true,
        pointProposalDelta: 50,
        pointProposalCategory: 'scene_mastery',
      });

    expect(retryRes.status).toBe(200);
    const secondPropId = retryRes.body.data.evaluation.pointProposalId;
    expect(secondPropId).toBe(firstPropId);

    // Total proposals for this student and challenge must remain exactly 1
    const totalProposals = await PointProposal.countDocuments({
      studentId: studentUser._id,
      sourceId: submission._id.toString(),
    });
    expect(totalProposals).toBe(1);
  });

  it('prevents self-evaluation when a director attempts to evaluate their own submission', async () => {
    // Create submission where student is directorUser
    const directorSelfSub = await Submission.create({
      studentId: directorUser._id,
      challengeId: challenge._id,
      audioUrl: 'https://storage.pdi.example.com/audio/director_take.wav',
      durationSeconds: 15.0,
      mimeType: 'audio/wav',
      submissionType: 'recorded',
      status: 'submitted',
    });

    const selfEvalRes = await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        submissionId: directorSelfSub._id.toString(),
        scores: { acting: 25, timing: 20, pronunciation: 20, expression: 20, audio: 15 },
        status: 'submitted',
      });

    expect(selfEvalRes.status).toBe(400);
    expect(selfEvalRes.body.success).toBe(false);
    expect(selfEvalRes.body.message).toContain('SELF_EVALUATION_FORBIDDEN');
  });

  it('prevents reverting a finalized submitted evaluation back to draft', async () => {
    // 1. Finalize submission
    await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        submissionId: submission._id.toString(),
        scores: { acting: 20, timing: 16, pronunciation: 16, expression: 16, audio: 12 },
        status: 'submitted',
      });

    // 2. Attempt to revert to draft
    const revertRes = await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        submissionId: submission._id.toString(),
        scores: { acting: 10, timing: 10, pronunciation: 10, expression: 10, audio: 10 },
        status: 'draft',
      });

    expect(revertRes.status).toBe(400);
    expect(revertRes.body.success).toBe(false);
    expect(revertRes.body.message).toContain('FINALIZED_EVALUATION_LOCKED');
  });
});
