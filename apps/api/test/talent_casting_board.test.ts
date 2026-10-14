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
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_talent_board_db';

let directorUser: any;
let directorToken: string;
let adminUser: any;
let adminToken: string;
let studentUser: any;
let studentToken: string;

let artist1: any;
let artist2: any;
let privateArtist: any;

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

  directorUser = await User.create({
    email: 'director_board@pdi.com',
    displayName: 'Director Board',
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
    email: 'admin_board@pdi.com',
    displayName: 'Admin Board',
    passwordHash: 'hashed',
    roles: ['admin'],
    status: 'active',
  });
  adminToken = generateToken({
    userId: adminUser._id.toString(),
    email: adminUser.email,
    roles: adminUser.roles,
  });

  studentUser = await User.create({
    email: 'student_board@pdi.com',
    displayName: 'Student Board',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  studentToken = generateToken({
    userId: studentUser._id.toString(),
    email: studentUser.email,
    roles: studentUser.roles,
  });

  // Create demo artist 1: S Rank, Heroic Lead
  artist1 = await User.create({
    email: 'aarav_board@pdi.com',
    displayName: 'Aarav Voice',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  await ArtistProfile.create({
    userId: artist1._id,
    displayName: 'Aarav Voice',
    bio: 'Veteran anime and battle dubber',
    voiceTypes: ['Heroic Lead', 'Deep Baritone'],
    languages: ['Hindi', 'English', 'Japanese'],
    rankPoints: 26000,
    currentRank: 'S',
    performanceAverage: 95.5,
    publicOptIn: true,
  });

  // Create demo artist 2: B Rank, Commercial
  artist2 = await User.create({
    email: 'meera_board@pdi.com',
    displayName: 'Meera Voice',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  await ArtistProfile.create({
    userId: artist2._id,
    displayName: 'Meera Voice',
    bio: 'Commercial radio specialist and narrator',
    voiceTypes: ['Warm Alto', 'Commercial Ad'],
    languages: ['English', 'Malayalam'],
    rankPoints: 6500,
    currentRank: 'B',
    performanceAverage: 88.0,
    publicOptIn: true,
  });

  // Create private artist: opted out of public directory
  privateArtist = await User.create({
    email: 'private_board@pdi.com',
    displayName: 'Private Voice',
    passwordHash: 'hashed',
    roles: ['student'],
    status: 'active',
  });
  await ArtistProfile.create({
    userId: privateArtist._id,
    displayName: 'Private Voice',
    bio: 'Confidential dubbing actor',
    voiceTypes: ['Heroic Lead'],
    languages: ['English'],
    rankPoints: 15000,
    currentRank: 'A',
    performanceAverage: 90.0,
    publicOptIn: false,
  });

  // Add a submission with sample audio for artist1
  const challenge = await Challenge.create({
    title: 'Board Demo Challenge',
    description: 'Test challenge',
    characterName: 'Hero',
    script: 'Action line',
    difficulty: 'Intermediate',
    targetRank: 'B',
    createdBy: directorUser._id,
  });

  await Submission.create({
    studentId: artist1._id,
    challengeId: challenge._id,
    audioUrl: 'https://example.com/aarav_demo.mp3',
    durationSeconds: 20,
    mimeType: 'audio/mpeg',
    submissionType: 'recorded',
    status: 'reviewed',
  });
});

describe('Phase 7: Casting Director Talent Board API', () => {
  it('enforces RBAC: allows director and admin, denies student and guest', async () => {
    // Guest: 401
    const guestRes = await request(app).get('/api/v1/director/talents');
    expect(guestRes.status).toBe(401);

    // Student: 403 Forbidden
    const studentRes = await request(app)
      .get('/api/v1/director/talents')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentRes.status).toBe(403);

    // Director: 200 OK
    const directorRes = await request(app)
      .get('/api/v1/director/talents')
      .set('Authorization', `Bearer ${directorToken}`);
    expect(directorRes.status).toBe(200);

    // Admin: 200 OK
    const adminRes = await request(app)
      .get('/api/v1/director/talents')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
  });

  it('retrieves opted-in talents with ranking, email, and sample audio reel', async () => {
    const res = await request(app)
      .get('/api/v1/director/talents')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.talents).toHaveLength(2); // Only opted-in talents (artist1, artist2), privateArtist excluded
    expect(res.body.data.total).toBe(2);

    const aarav = res.body.data.talents.find((t: any) => t.displayName === 'Aarav Voice');
    expect(aarav).toBeDefined();
    expect(aarav.currentRank).toBe('S');
    expect(aarav.rankPoints).toBe(26000);
    expect(aarav.email).toBe('aarav_board@pdi.com');
    expect(aarav.sampleAudioUrl).toBe('https://example.com/aarav_demo.mp3');
    expect(aarav.languages).toEqual(['Hindi', 'English', 'Japanese']);
    expect(aarav.totalSubmissions).toBe(1);
    expect(aarav.approvedSubmissions).toBe(1);
  });

  it('filters talents by rank tier (?rank=S)', async () => {
    const res = await request(app)
      .get('/api/v1/director/talents?rank=S')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.talents).toHaveLength(1);
    expect(res.body.data.talents[0].displayName).toBe('Aarav Voice');
    expect(res.body.data.talents[0].currentRank).toBe('S');
  });

  it('filters talents by voice type (?voiceType=Warm Alto)', async () => {
    const res = await request(app)
      .get('/api/v1/director/talents?voiceType=Warm Alto')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.talents).toHaveLength(1);
    expect(res.body.data.talents[0].displayName).toBe('Meera Voice');
  });

  it('filters talents by language (?language=Hindi and ?language=Malayalam)', async () => {
    const hindiRes = await request(app)
      .get('/api/v1/director/talents?language=Hindi')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(hindiRes.status).toBe(200);
    expect(hindiRes.body.data.talents).toHaveLength(1);
    expect(hindiRes.body.data.talents[0].displayName).toBe('Aarav Voice');

    const malRes = await request(app)
      .get('/api/v1/director/talents?language=Malayalam')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(malRes.status).toBe(200);
    expect(malRes.body.data.talents).toHaveLength(1);
    expect(malRes.body.data.talents[0].displayName).toBe('Meera Voice');
  });

  it('filters talents by minimum points threshold (?minPoints=10000)', async () => {
    const res = await request(app)
      .get('/api/v1/director/talents?minPoints=10000')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.talents).toHaveLength(1);
    expect(res.body.data.talents[0].displayName).toBe('Aarav Voice');
  });

  it('filters talents by search keyword in bio or name (?search=narrator)', async () => {
    const res = await request(app)
      .get('/api/v1/director/talents?search=narrator')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.talents).toHaveLength(1);
    expect(res.body.data.talents[0].displayName).toBe('Meera Voice');
  });

  it('safely handles special regex characters without crashing (?search=(Special*&voiceType=[Alto)', async () => {
    const res = await request(app)
      .get('/api/v1/director/talents?search=(Special*&voiceType=[Alto)')
      .set('Authorization', `Bearer ${directorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.talents).toEqual([]);
  });
});
