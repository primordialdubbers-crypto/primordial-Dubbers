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
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_targeted_materials_db';

let adminUser: any;
let directorUser: any;
let studentA: any;
let studentB: any;
let adminToken: string;
let directorToken: string;
let studentAToken: string;
let studentBToken: string;

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
    email: 'admin_mat@pdi.com',
    displayName: 'PDI Material Admin',
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
    email: 'director_mat@pdi.com',
    displayName: 'Director Vikram',
    passwordHash: 'hashed',
    roles: ['director'],
    status: 'active',
  });
  directorToken = generateToken({
    userId: directorUser._id.toString(),
    email: directorUser.email,
    roles: directorUser.roles,
  });

  studentA = await User.create({
    email: 'studentA_mat@pdi.com',
    displayName: 'Aarav Voice',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  studentAToken = generateToken({
    userId: studentA._id.toString(),
    email: studentA.email,
    roles: studentA.roles,
  });

  studentB = await User.create({
    email: 'studentB_mat@pdi.com',
    displayName: 'Bhavna Dubber',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  studentBToken = generateToken({
    userId: studentB._id.toString(),
    email: studentB.email,
    roles: studentB.roles,
  });
});

describe('Phase 1: Material Provision, Targeted Assignments & Dubbing Uploads', () => {
  it('allows Director/Admin to upload video/audio material via /admin/challenges/upload-media', async () => {
    const res = await request(app)
      .post('/api/v1/admin/challenges/upload-media')
      .set('Authorization', `Bearer ${directorToken}`)
      .attach('media', Buffer.from('fake mp4 video content'), {
        filename: 'reference_scene.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toMatch(/^\/uploads\/materials\//);
    expect(res.body.data.mimeType).toBe('video/mp4');
  });

  it('allows Director to create a targeted personal work material assigned to studentA', async () => {
    const res = await request(app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        title: 'Emotional Climax Scene (Personal)',
        description: 'Lead protagonist dramatic speech.',
        characterName: 'Arjun',
        script: 'I gave everything to this city, and what did it give in return?',
        difficulty: 'Advanced',
        targetRank: 'A',
        referenceMediaUrl: '/uploads/materials/arjun_scene.mp4',
        isPersonal: true,
        assignedStudentIds: [studentA._id.toString()],
        tags: ['drama', 'cinematic'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.challenge.isPersonal).toBe(true);
    expect(res.body.data.challenge.assignedStudentIds).toContain(studentA._id.toString());
  });

  it('enforces targeted visibility: studentA sees personal material, studentB does not', async () => {
    // 1. Create a public challenge
    await Challenge.create({
      title: 'Public Commercial Tagline',
      description: 'Energetic corporate voiceover',
      characterName: 'Narrator',
      script: 'Speed, power, precision. The future is here.',
      difficulty: 'Beginner',
      targetRank: 'ED',
      isPersonal: false,
      assignedStudentIds: [],
      createdBy: directorUser._id,
    });

    // 2. Create a targeted challenge for studentA
    await Challenge.create({
      title: 'Top Secret Anime Lead Take',
      description: 'High energy scream attack',
      characterName: 'Kenji',
      script: 'Never give up! Dragon burst wave!',
      difficulty: 'Master',
      targetRank: 'S',
      isPersonal: true,
      assignedStudentIds: [studentA._id],
      createdBy: directorUser._id,
    });

    // 3. Student A queries challenges
    const resA = await request(app)
      .get('/api/v1/challenges')
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(resA.status).toBe(200);
    const titlesA = resA.body.data.challenges.map((c: any) => c.title);
    expect(titlesA).toContain('Public Commercial Tagline');
    expect(titlesA).toContain('Top Secret Anime Lead Take');

    const targetedA = resA.body.data.challenges.find(
      (c: any) => c.title === 'Top Secret Anime Lead Take'
    );
    expect(targetedA.isAssignedToMe).toBe(true);
    expect(targetedA.isPersonal).toBe(true);

    // 4. Student B queries challenges
    const resB = await request(app)
      .get('/api/v1/challenges')
      .set('Authorization', `Bearer ${studentBToken}`);

    expect(resB.status).toBe(200);
    const titlesB = resB.body.data.challenges.map((c: any) => c.title);
    expect(titlesB).toContain('Public Commercial Tagline');
    expect(titlesB).not.toContain('Top Secret Anime Lead Take');

    // 5. Director queries challenges: sees all and has assignedStudents populated
    const resDirector = await request(app)
      .get('/api/v1/challenges')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(resDirector.status).toBe(200);
    const targetedDir = resDirector.body.data.challenges.find(
      (c: any) => c.title === 'Top Secret Anime Lead Take'
    );
    expect(targetedDir).toBeDefined();
    expect(targetedDir.assignedStudents.length).toBe(1);
    expect(targetedDir.assignedStudents[0].displayName).toBe('Aarav Voice');
  });

  it('allows student to submit a custom practice dubbing take without challengeId', async () => {
    const res = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', `Bearer ${studentBToken}`)
      .field('customTitle', 'Spider-Man Rooftop Speech Dub')
      .field('characterName', 'Peter Parker')
      .field('videoUrl', 'https://example.com/clips/spiderman_rooftop.mp4')
      .field('durationSeconds', 15.5)
      .field('mimeType', 'audio/webm')
      .field('syncOffsetMs', -120)
      .field('submissionType', 'recorded')
      .field('notes', 'Removed original dialogue, recorded with Shure MV7.')
      .attach('audio', Buffer.from('fake webm recorded audio'), {
        filename: 'take_spiderman.webm',
        contentType: 'audio/webm',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.submission.customTitle).toBe('Spider-Man Rooftop Speech Dub');
    expect(res.body.data.submission.challengeId).toBeNull();
    expect(res.body.data.submission.syncOffsetMs).toBe(-120);

    // Verify submission appears in student my submissions
    const mySubRes = await request(app)
      .get('/api/v1/submissions/my')
      .set('Authorization', `Bearer ${studentBToken}`);

    expect(mySubRes.status).toBe(200);
    expect(mySubRes.body.data.submissions.length).toBe(1);
    expect(mySubRes.body.data.submissions[0].challengeTitle).toBe('Spider-Man Rooftop Speech Dub');

    // Verify submission appears in director review queue
    const queueRes = await request(app)
      .get('/api/v1/director/review-queue')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(queueRes.status).toBe(200);
    const queueItem = queueRes.body.data.queue.find(
      (q: any) => q.customTitle === 'Spider-Man Rooftop Speech Dub'
    );
    expect(queueItem).toBeDefined();
    expect(queueItem.characterName).toBe('Peter Parker');
    expect(queueItem.syncOffsetMs).toBe(-120);
    expect(queueItem.studentName).toBe('Bhavna Dubber');
  });
});
