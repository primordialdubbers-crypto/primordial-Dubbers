import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  ArtistProfile,
  Challenge,
  Submission,
} from '../src/models/index.js';
import { generateToken } from '../src/utils/token.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_challenges_db';

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
  await Challenge.deleteMany({});
  await Submission.deleteMany({});
  await disconnectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await Challenge.deleteMany({});
  await Submission.deleteMany({});

  adminUser = await User.create({
    email: 'admin_challenge@pdi.com',
    displayName: 'PDI Challenge Admin',
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
    email: 'director_challenge@pdi.com',
    displayName: 'Casting Director Jane',
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
    email: 'student_audition@pdi.com',
    displayName: 'Voice Talent Sam',
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
    rankPoints: 1200,
    currentRank: 'C',
    publicOptIn: true,
  });
});

describe('Phase 4: Challenges, Audition Library & Media Storage Abstraction', () => {
  it('creates and lists challenges with difficulty and rank filters', async () => {
    // 1. Staff creates beginner challenge
    const createRes1 = await request(app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        title: 'Cyberpunk Commercial Teaser',
        description: 'Gritty, rhythmic commercial voice-over for neon sci-fi brand',
        characterName: 'Narrator',
        script: 'In a city where chrome meets neon, your voice is the only weapon that matters.',
        difficulty: 'Beginner',
        targetRank: 'ED',
        referenceMediaUrl: 'https://cdn.pdi.com/ref/cyberpunk_sample.mp4',
        tags: ['commercial', 'scifi', 'narration'],
      });

    expect(createRes1.status).toBe(201);
    expect(createRes1.body.data.challenge.title).toBe('Cyberpunk Commercial Teaser');
    const challenge1Id = createRes1.body.data.challenge.id;

    // 2. Staff creates advanced challenge
    const createRes2 = await request(app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Shonen Anime Battle Climax',
        description: 'Intense screaming battle monologue with tight lip flaps sync',
        characterName: 'Captain Kenji',
        script: 'I will never yield! As long as the flame of justice burns, we will prevail!',
        difficulty: 'Advanced',
        targetRank: 'A',
        tags: ['anime', 'action', 'screaming'],
      });

    expect(createRes2.status).toBe(201);
    const challenge2Id = createRes2.body.data.challenge.id;

    // 3. Query all challenges
    const allRes = await request(app).get('/api/v1/challenges');
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.challenges.length).toBe(2);

    // 4. Query with difficulty filter: Advanced
    const advRes = await request(app).get('/api/v1/challenges?difficulty=Advanced');
    expect(advRes.status).toBe(200);
    expect(advRes.body.data.challenges.length).toBe(1);
    expect(advRes.body.data.challenges[0].id).toBe(challenge2Id);

    // 5. Query single challenge by ID
    const singleRes = await request(app).get(`/api/v1/challenges/${challenge1Id}`);
    expect(singleRes.status).toBe(200);
    expect(singleRes.body.data.challenge.characterName).toBe('Narrator');
  });

  it('allows staff to update and delete challenges', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Fantasy Hero Introduction',
        description: 'Noble hero entering the tavern',
        characterName: 'Alistair',
        script: 'Greetings travelers, rest your blades tonight.',
        difficulty: 'Intermediate',
        targetRank: 'B',
        tags: ['fantasy'],
      });

    const challengeId = createRes.body.data.challenge.id;

    // Update challenge
    const updateRes = await request(app)
      .put(`/api/v1/admin/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Fantasy Hero Introduction (Extended)',
        difficulty: 'Advanced',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.challenge.title).toBe('Fantasy Hero Introduction (Extended)');
    expect(updateRes.body.data.challenge.difficulty).toBe('Advanced');

    // Delete challenge
    const delRes = await request(app)
      .delete(`/api/v1/admin/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);

    const getAfter = await request(app).get(`/api/v1/challenges/${challengeId}`);
    expect(getAfter.status).toBe(404);
  });

  it('uploads audio through media storage abstraction and rejects invalid MIME types', async () => {
    // 1. Valid WAV audio buffer
    const mockWavBuffer = Buffer.from('RIFF....WAVEfmt ....data....mockwavcontent');
    const validUpload = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('audio', mockWavBuffer, {
        filename: 'voice_take_01.wav',
        contentType: 'audio/wav',
      });

    expect(validUpload.status).toBe(201);
    expect(validUpload.body.success).toBe(true);
    expect(validUpload.body.data.url).toMatch(/^\/uploads\/audio\//);
    expect(validUpload.body.data.mimeType).toBe('audio/wav');

    // 2. Invalid non-audio MIME type (e.g. text/plain or image)
    const invalidUpload = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('audio', Buffer.from('some text data'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(invalidUpload.status).toBe(400);
    expect(invalidUpload.body.success).toBe(false);
  });

  it('submits audition take and allows student to view their takes and directors to inspect', async () => {
    // Create challenge
    const challenge = await Challenge.create({
      title: 'Romance Visual Novel Scene',
      description: 'Gentle, warm, conversational reading',
      characterName: 'Ren',
      script: 'I never thought you would remember that rainy evening under the cherry blossoms.',
      difficulty: 'Beginner',
      targetRank: 'ED',
      createdBy: adminUser._id,
      isActive: true,
    });

    // Student submits audition take (JSON payload with valid audio URL)
    const subRes = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        challengeId: challenge._id.toString(),
        audioUrl: '/uploads/audio/take_ren_01.wav',
        durationSeconds: 14.5,
        mimeType: 'audio/wav',
        submissionType: 'recorded',
        notes: 'Take 2 with softer inflection on the final sentence',
      });

    expect(subRes.status).toBe(201);
    expect(subRes.body.data.submission.status).toBe('submitted');
    expect(subRes.body.data.submission.durationSeconds).toBe(14.5);

    // Student queries own submissions
    const myTakes = await request(app)
      .get('/api/v1/submissions/my')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(myTakes.status).toBe(200);
    expect(myTakes.body.data.submissions.length).toBe(1);
    expect(myTakes.body.data.submissions[0].challengeTitle).toBe('Romance Visual Novel Scene');
    expect(myTakes.body.data.submissions[0].characterName).toBe('Ren');

    // Director queries submissions for this challenge
    const challengeTakes = await request(app)
      .get(`/api/v1/challenges/${challenge._id}/submissions`)
      .set('Authorization', `Bearer ${directorToken}`);

    expect(challengeTakes.status).toBe(200);
    expect(challengeTakes.body.data.submissions.length).toBe(1);
    expect(challengeTakes.body.data.submissions[0].studentName).toBe('Voice Talent Sam');
  });

  it('rejects audition submissions to inactive challenges', async () => {
    const inactiveChallenge = await Challenge.create({
      title: 'Archived Seasonal Challenge',
      description: 'Expired event challenge',
      characterName: 'Ghost',
      script: 'Past midnight, the shadows speak.',
      difficulty: 'Master',
      targetRank: 'S',
      createdBy: adminUser._id,
      isActive: false, // Inactive
    });

    const res = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        challengeId: inactiveChallenge._id.toString(),
        audioUrl: '/uploads/audio/ghost_take.mp3',
        durationSeconds: 8.2,
        mimeType: 'audio/mpeg',
        submissionType: 'uploaded',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CHALLENGE_INACTIVE');
  });

  it('allows updating challenge via PATCH and safely filters by regex special characters', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Sci-Fi [Mech] Pilot',
        description: 'Pilot dialogue in emergency cockpit (Warning Sirens)',
        characterName: 'Pilot [Unit 01]',
        script: 'Warning! Core temperature critical (95%). All thrusters disengaged!',
        difficulty: 'Master',
        targetRank: 'S',
        tags: ['scifi', 'mecha'],
      });

    const challengeId = createRes.body.data.challenge.id;

    // 1. PATCH challenge update
    const patchRes = await request(app)
      .patch(`/api/v1/admin/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        difficulty: 'Intermediate',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.challenge.difficulty).toBe('Intermediate');

    // 2. Search with regex special characters '[Mech]' and '(95%)'
    const searchRes = await request(app)
      .get('/api/v1/challenges?search=[Mech]');

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.challenges.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.body.data.challenges[0].id).toBe(challengeId);
  });

  it('rejects audition submissions with invalid duration (e.g. 0 or > 600s)', async () => {
    const challenge = await Challenge.create({
      title: 'Short Reaction Take',
      description: 'Quick gasp sound',
      characterName: 'Hero',
      script: 'Look out!',
      difficulty: 'Beginner',
      targetRank: 'ED',
      createdBy: adminUser._id,
      isActive: true,
    });

    // Zero / negative duration
    const zeroRes = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        challengeId: challenge._id.toString(),
        audioUrl: '/uploads/audio/zero_take.wav',
        durationSeconds: 0,
        mimeType: 'audio/wav',
        submissionType: 'uploaded',
      });

    expect(zeroRes.status).toBe(400);

    // Excessive duration (> 600s = 10 minutes)
    const longRes = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        challengeId: challenge._id.toString(),
        audioUrl: '/uploads/audio/long_take.wav',
        durationSeconds: 650,
        mimeType: 'audio/wav',
        submissionType: 'uploaded',
      });

    expect(longRes.status).toBe(400);
  });
});

