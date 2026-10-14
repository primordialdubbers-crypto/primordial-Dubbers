import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, ArtistProfile } from '../src/models/index.js';
import { generateToken } from '../src/utils/token.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_artist_profile_db';

let studentUser: any;
let studentToken: string;

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

  studentUser = await User.create({
    email: 'profile_artist@pdi.com',
    displayName: 'Elena Voice',
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
    bio: 'Specializing in anime and commercial voice-overs.',
    voiceTypes: ['Warm Lead', 'Anime Boy'],
    rankPoints: 1250,
    currentRank: 'C',
    publicOptIn: true,
  });
});

describe('Phase 2: Artist Profile API', () => {
  it('retrieves public artist profile by userId with rank progress', async () => {
    const res = await request(app).get(`/api/v1/artists/${studentUser._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.displayName).toBe('Elena Voice');
    expect(res.body.data.profile.currentRank).toBe('C');
    expect(res.body.data.profile.rankPoints).toBe(1250);
    expect(res.body.data.profile.rankProgress.nextTier).toBe('B');
    expect(res.body.data.profile.rankProgress.pointsToNextTier).toBe(5000 - 1250);
  });

  it('retrieves authenticated user own profile via /api/v1/me/profile', async () => {
    const res = await request(app)
      .get('/api/v1/me/profile')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.profile.userId).toBe(studentUser._id.toString());
    expect(res.body.data.profile.bio).toContain('Specializing in anime');
    expect(res.body.data.profile.voiceTypes).toEqual(['Warm Lead', 'Anime Boy']);
  });

  it('updates authenticated user profile via PATCH /api/v1/me/profile', async () => {
    const res = await request(app)
      .patch('/api/v1/me/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        displayName: 'Elena Vance Voice',
        bio: 'Updated bio with studio experience.',
        voiceTypes: ['Warm Lead', 'Anime Boy', 'Heroine'],
        publicOptIn: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.profile.displayName).toBe('Elena Vance Voice');
    expect(res.body.data.profile.bio).toBe('Updated bio with studio experience.');
    expect(res.body.data.profile.voiceTypes).toHaveLength(3);

    // Verify DB update
    const profile = await ArtistProfile.findOne({ userId: studentUser._id });
    expect(profile?.displayName).toBe('Elena Vance Voice');
    expect(profile?.bio).toBe('Updated bio with studio experience.');

    const user = await User.findById(studentUser._id);
    expect(user?.displayName).toBe('Elena Vance Voice');
  });

  it('returns 404 when requested artist does not exist', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app).get(`/api/v1/artists/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('enforces privacy: hides private profiles from guests and unauthorized students but permits owner and staff', async () => {
    // 1. Create a private student profile
    const privateStudent = await User.create({
      email: 'secret_student@pdi.com',
      displayName: 'Secret Voice',
      passwordHash: 'hashed',
      roles: ['student'],
      status: 'active',
    });
    const privateToken = generateToken({
      userId: privateStudent._id.toString(),
      email: privateStudent.email,
      roles: privateStudent.roles,
    });
    await ArtistProfile.create({
      userId: privateStudent._id,
      displayName: privateStudent.displayName,
      bio: 'Top secret dubbing project.',
      voiceTypes: ['Stealth Agent'],
      rankPoints: 6000,
      currentRank: 'B',
      publicOptIn: false,
    });

    // 2. Unauthenticated guest query -> 404 PROFILE_PRIVATE
    const guestRes = await request(app).get(`/api/v1/artists/${privateStudent._id}`);
    expect(guestRes.status).toBe(404);
    expect(guestRes.body.error.code).toBe('PROFILE_PRIVATE');

    // 3. Different student query -> 404 PROFILE_PRIVATE
    const otherStudentRes = await request(app)
      .get(`/api/v1/artists/${privateStudent._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(otherStudentRes.status).toBe(404);
    expect(otherStudentRes.body.error.code).toBe('PROFILE_PRIVATE');

    // 4. Owner queries their own profile -> 200 OK
    const ownerRes = await request(app)
      .get(`/api/v1/artists/${privateStudent._id}`)
      .set('Authorization', `Bearer ${privateToken}`);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.profile.displayName).toBe('Secret Voice');

    // 5. Casting Director queries private profile -> 200 OK
    const directorUser = await User.create({
      email: 'staff_director@pdi.com',
      displayName: 'Staff Director',
      passwordHash: 'hashed',
      roles: ['director'],
      status: 'active',
    });
    const directorToken = generateToken({
      userId: directorUser._id.toString(),
      email: directorUser.email,
      roles: directorUser.roles,
    });
    const directorRes = await request(app)
      .get(`/api/v1/artists/${privateStudent._id}`)
      .set('Authorization', `Bearer ${directorToken}`);
    expect(directorRes.status).toBe(200);
    expect(directorRes.body.data.profile.displayName).toBe('Secret Voice');
  });
});

