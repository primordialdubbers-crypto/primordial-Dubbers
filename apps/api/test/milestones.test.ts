import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, ArtistProfile, Challenge, Submission } from '../src/models/index.js';
import { calculateArtistMilestones } from '@pdi/shared';
import { generateToken } from '../src/utils/token.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_milestones_db';

let studentUser: any;
let studentToken: string;
let challenge: any;

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

  studentUser = await User.create({
    email: 'milestone_artist@pdi.com',
    displayName: 'Milestone Artist',
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
    rankPoints: 5500, // Rank B
    currentRank: 'B',
    publicOptIn: true,
  });

  challenge = await Challenge.create({
    title: 'Milestone Audition 1',
    description: 'Test challenge',
    characterName: 'Hero',
    script: 'Line',
    difficulty: 'Intermediate',
    targetRank: 'B',
    createdBy: studentUser._id,
  });

  // Create 2 submissions for the artist
  await Submission.create([
    {
      studentId: studentUser._id,
      challengeId: challenge._id,
      audioUrl: 'https://example.com/audio1.mp3',
      durationSeconds: 12,
      mimeType: 'audio/mpeg',
      submissionType: 'recorded',
      status: 'reviewed',
    },
    {
      studentId: studentUser._id,
      challengeId: challenge._id,
      audioUrl: 'https://example.com/audio2.mp3',
      durationSeconds: 15,
      mimeType: 'audio/mpeg',
      submissionType: 'recorded',
      status: 'submitted',
    },
  ]);
});

describe('Phase 7: Milestone Achievements System', () => {
  it('correctly calculates milestone unlocking based on rank thresholds and audition counts', () => {
    // 1. New artist: 0 pts, 0 auditions
    const cadet = calculateArtistMilestones({ rankPoints: 0 }, 0);
    expect(cadet.find((m) => m.id === 'cadet_voice')?.unlocked).toBe(true);
    expect(cadet.find((m) => m.id === 'rising_talent')?.unlocked).toBe(false);
    expect(cadet.find((m) => m.id === 'first_take')?.unlocked).toBe(false);

    // 2. Rank C artist: 1,500 pts, 1 audition
    const cArtist = calculateArtistMilestones({ rankPoints: 1500 }, 1);
    expect(cArtist.find((m) => m.id === 'cadet_voice')?.unlocked).toBe(true);
    expect(cArtist.find((m) => m.id === 'rising_talent')?.unlocked).toBe(true);
    expect(cArtist.find((m) => m.id === 'studio_regular')?.unlocked).toBe(false);
    expect(cArtist.find((m) => m.id === 'first_take')?.unlocked).toBe(true);
    expect(cArtist.find((m) => m.id === 'scene_stealer')?.unlocked).toBe(false);

    // 3. Pro Rank A artist: 14,000 pts, 6 auditions
    const aArtist = calculateArtistMilestones({ rankPoints: 14000 }, 6);
    expect(aArtist.find((m) => m.id === 'pro_performer')?.unlocked).toBe(true);
    expect(aArtist.find((m) => m.id === 'elite_legend')?.unlocked).toBe(false);
    expect(aArtist.find((m) => m.id === 'scene_stealer')?.unlocked).toBe(true);
    expect(aArtist.find((m) => m.id === 'dubbing_virtuoso')?.unlocked).toBe(false);

    // 4. Elite Legend S Rank artist: 30,000 pts, 12 auditions
    const sArtist = calculateArtistMilestones({ rankPoints: 30000 }, 12);
    expect(sArtist.every((m) => m.unlocked)).toBe(true);
  });

  it('delivers calculated milestones in public artist profile endpoint (/api/v1/artists/:userId)', async () => {
    const res = await request(app).get(`/api/v1/artists/${studentUser._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const profile = res.body.data.profile;
    expect(profile.milestones).toBeDefined();
    expect(profile.milestones).toHaveLength(8);

    // Student has 5500 points (Rank B) and 2 submissions
    const cadet = profile.milestones.find((m: any) => m.id === 'cadet_voice');
    const rising = profile.milestones.find((m: any) => m.id === 'rising_talent');
    const regular = profile.milestones.find((m: any) => m.id === 'studio_regular');
    const pro = profile.milestones.find((m: any) => m.id === 'pro_performer');
    const firstTake = profile.milestones.find((m: any) => m.id === 'first_take');
    const sceneStealer = profile.milestones.find((m: any) => m.id === 'scene_stealer');

    expect(cadet.unlocked).toBe(true);
    expect(rising.unlocked).toBe(true);
    expect(regular.unlocked).toBe(true);
    expect(pro.unlocked).toBe(false);
    expect(firstTake.unlocked).toBe(true);
    expect(sceneStealer.unlocked).toBe(false);
  });

  it('delivers calculated milestones in current user profile endpoint (/api/v1/me/profile)', async () => {
    const res = await request(app)
      .get('/api/v1/me/profile')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const profile = res.body.data.profile;
    expect(profile.milestones).toBeDefined();
    expect(profile.milestones).toHaveLength(8);
  });
});
