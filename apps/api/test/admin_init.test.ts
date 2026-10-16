import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { ArtistProfile } from '../src/models/ArtistProfile.js';
import { ensureAdminUser } from '../src/services/adminInit.service.js';
import { config } from '../src/config/env.js';

const TEST_DB_URI = 'mongodb://localhost:27017/pdi_test_admin_init_db';

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
});

describe('Admin Initialization Service (ensureAdminUser)', () => {
  it('automatically creates default admin and corresponding artistProfile in MongoDB when none exists', async () => {
    // Confirm zero users exist
    expect(await User.countDocuments({})).toBe(0);
    expect(await ArtistProfile.countDocuments({})).toBe(0);

    // Run initialization
    await ensureAdminUser();

    // Verify admin user is saved in MongoDB
    const adminUser = await User.findOne({ email: config.adminDefaultEmail.toLowerCase().trim() });
    expect(adminUser).not.toBeNull();
    expect(adminUser?.roles).toContain('admin');
    expect(adminUser?.roles).toContain('superadmin');
    expect(adminUser?.status).toBe('active');

    // Verify bcrypt password hashing
    const isPasswordValid = await bcrypt.compare(config.adminDefaultPassword, adminUser!.passwordHash);
    expect(isPasswordValid).toBe(true);

    // Verify corresponding artistProfiles record in MongoDB
    const adminProfile = await ArtistProfile.findOne({ userId: adminUser!._id });
    expect(adminProfile).not.toBeNull();
    expect(adminProfile?.displayName).toBe('Primordial Dubbers Admin');
    expect(adminProfile?.currentRank).toBe('S');
  });

  it('is idempotent: does not recreate or duplicate admin if one already exists in MongoDB', async () => {
    await ensureAdminUser();
    const countBefore = await User.countDocuments({ roles: 'admin' });
    expect(countBefore).toBe(1);

    // Run again
    await ensureAdminUser();
    const countAfter = await User.countDocuments({ roles: 'admin' });
    expect(countAfter).toBe(1);
  });

  it('elevates an existing non-admin user with adminDefaultEmail and provisions missing artistProfile', async () => {
    // Pre-create user with student role only and no profile
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('OldPassword123!', salt);
    const user = await User.create({
      email: config.adminDefaultEmail.toLowerCase().trim(),
      displayName: 'Existing User',
      passwordHash: hash,
      roles: ['student'],
      status: 'active',
    });

    expect(await ArtistProfile.countDocuments({ userId: user._id })).toBe(0);

    await ensureAdminUser();

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.roles).toContain('admin');
    expect(updatedUser?.roles).toContain('superadmin');

    const profile = await ArtistProfile.findOne({ userId: user._id });
    expect(profile).not.toBeNull();
    expect(profile?.displayName).toBe('Existing User');
  });

  it('ensures default admin account exists even if another admin already exists in database', async () => {
    // Create another different admin
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('AnotherAdminPass!', salt);
    await User.create({
      email: 'otheradmin@pdi.academy',
      displayName: 'Other Admin',
      passwordHash: hash,
      roles: ['admin'],
      status: 'active',
    });

    await ensureAdminUser();

    // Verify both exist
    const defaultAdmin = await User.findOne({ email: config.adminDefaultEmail.toLowerCase().trim() });
    expect(defaultAdmin).not.toBeNull();
    expect(defaultAdmin?.roles).toContain('admin');

    const totalAdmins = await User.countDocuments({ roles: 'admin' });
    expect(totalAdmins).toBe(2);
  });
});
