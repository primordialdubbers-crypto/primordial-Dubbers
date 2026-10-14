import bcrypt from 'bcryptjs';
import { User, ArtistProfile } from '../models/index.js';
import { config } from '../config/env.js';

/**
 * Ensures at least one Administrator exists in the MongoDB database.
 * If no admin exists, creates default administrator credentials with bcrypt hashing
 * and creates the corresponding artistProfiles record in MongoDB.
 */
export async function ensureAdminUser(): Promise<void> {
  const adminEmail = (config.adminDefaultEmail || 'admin@pdi.academy').toLowerCase().trim();
  const adminPassword = config.adminDefaultPassword || 'Admin@123456';

  let adminUser = await User.findOne({ email: adminEmail });

  if (!adminUser) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    adminUser = await User.create({
      email: adminEmail,
      displayName: 'PDI Senior Administrator',
      passwordHash,
      roles: ['admin', 'superadmin'],
      status: 'active',
    });

    console.log(`[PDI MongoDB Init] Default admin user initialized in MongoDB: ${adminEmail}`);
  } else {
    let modified = false;

    if (!adminUser.roles.includes('admin')) {
      adminUser.roles.push('admin');
      modified = true;
    }
    if (!adminUser.roles.includes('superadmin')) {
      adminUser.roles.push('superadmin');
      modified = true;
    }

    if (modified) {
      await adminUser.save();
      console.log(`[PDI MongoDB Init] Granted admin role to: ${adminEmail}`);
    }
  }

  // Ensure matching artistProfile exists for admin in MongoDB
  const profile = await ArtistProfile.findOne({ userId: adminUser._id });
  if (!profile) {
    await ArtistProfile.create({
      userId: adminUser._id,
      displayName: adminUser.displayName || 'PDI Senior Administrator',
      bio: 'Authoritative system administrator with full governance clearance.',
      voiceTypes: ['Administrator'],
      languages: ['English', 'Hindi'],
      publicOptIn: false,
      rankPoints: 50000,
      currentRank: 'S',
      performanceAverage: 100,
      version: 1,
    });
    console.log(`[PDI MongoDB Init] Created artistProfile record for admin in MongoDB`);
  }
}
