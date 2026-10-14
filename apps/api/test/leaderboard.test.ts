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
});

afterAll(async () => {
  await User.deleteMany({});
  await ArtistProfile.deleteMany({});
  await disconnectDB();
});

describe('Leaderboard API (/api/v1/leaderboard)', () => {
  it('returns opted-in artists sorted by rank points descending', async () => {
    const res = await request(app).get('/api/v1/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCount).toBe(2);

    const items = res.body.data.leaderboard;
    expect(items[0].displayName).toBe('Elite Leader');
    expect(items[0].currentRank).toBe('S');
    expect(items[0].rankPoints).toBe(26000);

    expect(items[1].displayName).toBe('Developing Voice');
    expect(items[1].currentRank).toBe('C');
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
});
