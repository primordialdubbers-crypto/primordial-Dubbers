import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { ArtistProfile } from '../src/models/ArtistProfile.js';

const app = createApp();
const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_leaderboard_db';

beforeAll(async () => {
  await connectDB(TEST_DB_URI);
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});

  // Create 3 users and artist profiles
  const u1 = await User.create({
    email: 'leader1@example.com',
    displayName: 'Elite Leader',
    passwordHash: 'hash',
    roles: ['student'],
    status: 'active',
  });
  await ArtistProfile.create({
    userId: u1._id,
    displayName: 'Elite Leader',
    rankPoints: 26000,
    currentRank: 'S',
    publicOptIn: true,
    performanceAverage: 95.5,
    voiceTypes: ['Deep Lead'],
  });

  const u2 = await User.create({
    email: 'leader2@example.com',
    displayName: 'Developing Voice',
    passwordHash: 'hash',
    roles: ['student'],
    status: 'active',
  });
  await ArtistProfile.create({
    userId: u2._id,
    displayName: 'Developing Voice',
    rankPoints: 3200,
    currentRank: 'C',
    publicOptIn: true,
    performanceAverage: 82.0,
    voiceTypes: ['Anime'],
  });

  // Opted-out user (should be excluded from public leaderboard)
  const u3 = await User.create({
    email: 'private@example.com',
    displayName: 'Private Artist',
    passwordHash: 'hash',
    roles: ['student'],
    status: 'active',
  });
  await ArtistProfile.create({
    userId: u3._id,
    displayName: 'Private Artist',
    rankPoints: 15000,
    currentRank: 'A',
    publicOptIn: false,
    performanceAverage: 90.0,
  });
  // Staff user (Director)
  const uStaff = await User.create({
    email: 'director@example.com',
    displayName: 'Chief Casting Director',
    passwordHash: 'hash',
    roles: ['director'],
    status: 'active',
  });
  await ArtistProfile.create({
    userId: uStaff._id,
    displayName: 'Chief Casting Director',
    rankPoints: 6500,
    currentRank: 'A',
    profileType: 'staff',
    staffDesignation: 'Senior Director',
    publicOptIn: true,
  });
});

afterAll(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await disconnectDB();
});

describe('Leaderboard API (/api/v1/leaderboard)', () => {
  it('returns opted-in artists sorted by rank points descending and strictly excludes staff', async () => {
    const res = await request(app).get('/api/v1/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('student');
    expect(res.body.data.totalCount).toBe(2);

    const items = res.body.data.leaderboard;
    expect(items[0].displayName).toBe('Elite Leader');
    expect(items[0].currentRank).toBe('S');
    expect(items[0].rankPoints).toBe(26000);

    expect(items[1].displayName).toBe('Developing Voice');
    expect(items[1].currentRank).toBe('C');

    // Ensure staff member Chief Casting Director is NOT on student leaderboard
    const staffOnBoard = items.find((i: any) => i.displayName === 'Chief Casting Director');
    expect(staffOnBoard).toBeUndefined();
  });

  it('filters by rank tier when query parameter is provided', async () => {
    const res = await request(app).get('/api/v1/leaderboard?tier=S');
    expect(res.status).toBe(200);
    expect(res.body.data.totalCount).toBe(1);
    expect(res.body.data.leaderboard[0].currentRank).toBe('S');
  });

  it('filters by search term matching artist display name', async () => {
    const res = await request(app).get('/api/v1/leaderboard?q=developing');
    expect(res.status).toBe(200);
    expect(res.body.data.totalCount).toBe(1);
    expect(res.body.data.leaderboard[0].displayName).toBe('Developing Voice');
  });

  it('rejects unauthenticated or student requests to staff leaderboard with 403 Forbidden', async () => {
    const res = await request(app).get('/api/v1/leaderboard?type=staff');
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('STAFF_RANKING_FORBIDDEN');
  });

  it('returns staff rankings with designations and points for authenticated staff', async () => {
    const staffUser = await User.findOne({ email: 'director@example.com' });
    const { signToken } = await import('../src/utils/token.js');
    const token = signToken({
      userId: staffUser!._id.toString(),
      email: staffUser!.email,
      roles: staffUser!.roles,
    });

    const res = await request(app)
      .get('/api/v1/leaderboard?type=staff')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('staff');
    expect(res.body.data.totalCount).toBeGreaterThanOrEqual(1);

    const staffEntry = res.body.data.leaderboard.find((s: any) => s.email === 'director@example.com');
    expect(staffEntry).toBeDefined();
    expect(staffEntry.displayName).toBe('Chief Casting Director');
    // Under Option 1 scale, 6,500 points evaluates to Rank C (5,000 - 11,999)
    expect(staffEntry.currentRank).toBe('C');
    expect(staffEntry.staffDesignation).toBe('Senior Director');
    expect(staffEntry.rankPoints).toBe(6500);
  });

  it('strictly excludes suspended and deleted accounts from the leaderboard', async () => {
    // 1. Create a student user and profile
    const testStudent = await User.create({
      email: 'tobedeleted@example.com',
      displayName: 'Temporary Voice Artist',
      passwordHash: 'hash',
      roles: ['student'],
      status: 'active',
    });
    const testProfile = await ArtistProfile.create({
      userId: testStudent._id,
      displayName: 'Temporary Voice Artist',
      rankPoints: 18000,
      currentRank: 'B',
      publicOptIn: true,
      performanceAverage: 88,
    });

    // Verify they show up when active
    let res = await request(app).get('/api/v1/leaderboard');
    expect(res.body.data.leaderboard.some((i: any) => i.displayName === 'Temporary Voice Artist')).toBe(true);

    // 2. Suspend the user
    testStudent.status = 'suspended';
    await testStudent.save();

    // Verify suspended user is immediately excluded from leaderboard
    res = await request(app).get('/api/v1/leaderboard');
    expect(res.body.data.leaderboard.some((i: any) => i.displayName === 'Temporary Voice Artist')).toBe(false);

    // 3. Delete the user (simulate admin deletion with orphan profile)
    await User.findByIdAndDelete(testStudent._id);

    // Verify deleted user is excluded even if orphaned profile exists
    res = await request(app).get('/api/v1/leaderboard');
    expect(res.body.data.leaderboard.some((i: any) => i.displayName === 'Temporary Voice Artist')).toBe(false);

    // Cleanup orphan profile
    await ArtistProfile.findByIdAndDelete(testProfile._id);
  });
});
