import bcrypt from 'bcryptjs';
import { User, ArtistProfile } from '../models/index.js';
import { config } from '../config/env.js';

/**
 * Ensures at least one Administrator exists in the MongoDB database.
 * If no admin exists, creates default administrator credentials with bcrypt hashing
 * and creates the corresponding artistProfiles record in MongoDB.
 */
export async function ensureAdminUser(): Promise<void> {
  const adminEmail = (config.adminDefaultEmail || 'primordialdubbers@gmail.com').toLowerCase().trim();
  const adminPassword = config.adminDefaultPassword || 'Admin@123456';

  let adminUser = await User.findOne({ email: adminEmail });

  if (!adminUser) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    adminUser = await User.create({
      email: adminEmail,
      displayName: adminEmail.includes('primordial') ? 'Primordial Dubbers Admin' : 'PDI Senior Administrator',
      passwordHash,
      roles: ['admin', 'superadmin'],
      status: 'active',
    });

    console.log(`[PDI MongoDB Init] Authoritative Admin user initialized in MongoDB: ${adminEmail}`);
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
    if (adminUser.status !== 'active') {
      adminUser.status = 'active';
      modified = true;
    }

    // Check if password matches, if not rehash with adminPassword
    const isPasswordValid = await bcrypt.compare(adminPassword, adminUser.passwordHash);
    if (!isPasswordValid) {
      const salt = await bcrypt.genSalt(10);
      adminUser.passwordHash = await bcrypt.hash(adminPassword, salt);
      modified = true;
    }

    if (modified) {
      await adminUser.save();
      console.log(`[PDI MongoDB Init] Granted admin role/updated password for: ${adminEmail}`);
    }
  }

  // Ensure matching artistProfile exists for admin in MongoDB
  const profile = await ArtistProfile.findOne({ userId: adminUser._id });
  if (!profile) {
    await ArtistProfile.create({
      userId: adminUser._id,
      displayName: adminUser.displayName || 'Primordial Dubbers Admin',
      bio: 'Authoritative system administrator with full governance clearance.',
      voiceTypes: ['Administrator'],
      languages: ['English', 'Hindi'],
      publicOptIn: false,
      profileType: 'staff',
      staffDesignation: 'Lead Executive Director',
      rankPoints: 50000,
      currentRank: 'S',
      performanceAverage: 100,
      version: 1,
    });
    console.log(`[PDI MongoDB Init] Created artistProfile record for admin in MongoDB: ${adminEmail}`);
  } else if (profile.profileType !== 'staff' || !profile.staffDesignation) {
    profile.profileType = 'staff';
    profile.staffDesignation = 'Lead Executive Director';
    profile.publicOptIn = false;
    await profile.save();
    console.log(`[PDI MongoDB Init] Updated admin profile to staff type in MongoDB: ${adminEmail}`);
  }

  // Automatically purge legacy static demo accounts from MongoDB (e.g. admin@pdi.academy, director@pdi.academy)
  if (config.nodeEnv !== 'test') {
    try {
      const dummyUsers = await User.find({
        email: { $in: ['admin@pdi.academy', 'director@pdi.academy', /@pdi\.academy$/i] },
        _id: { $ne: adminUser._id },
      });

      for (const dUser of dummyUsers) {
        if (dUser.email.toLowerCase() !== adminEmail) {
          await ArtistProfile.deleteMany({ userId: dUser._id });
          await User.findByIdAndDelete(dUser._id);
          console.log(`[PDI MongoDB Init] Purged static dummy user from database: ${dUser.email}`);
        }
      }
    } catch (cleanupErr) {
      console.warn('[PDI MongoDB Init] Error cleaning up static users:', cleanupErr);
    }
  }
}
