import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import {
  User,
  ArtistProfile,
  Challenge,
} from '../models/index.js';
import { ensureAdminUser } from '../services/adminInit.service.js';

export async function seedDatabase(mongoUri?: string) {
  const uri = mongoUri || config.mongodbUri;
  console.log(`[PDI Seed] Connecting to MongoDB: ${uri}`);
  await connectDB(uri);

  // 1. Ensure authoritative Admin user
  await ensureAdminUser();
  const adminUser = await User.findOne({
    roles: 'admin',
    email: (config.adminDefaultEmail || 'primordialdubbers@gmail.com').toLowerCase().trim(),
  });

  if (!adminUser) {
    throw new Error('Admin user could not be found or initialized.');
  }

  // 2. Seed Standard Academy Practice Challenges (Open for auditions)
  const initialChallenges = [
    {
      title: 'Shonen Awakening Monologue',
      description: 'High-octane climax speech delivering raw battle determination and emotional range.',
      characterName: 'Renjiro the Firebrand',
      script: 'You think you can extinguish this flame? As long as my voice can reach the sky, my blade will never shatter!',
      difficulty: 'Advanced',
      targetRank: 'A',
      tags: ['Anime', 'Action', 'Shonen', 'High Intensity'],
      isActive: true,
      createdBy: adminUser._id,
    },
    {
      title: 'Cyberpunk Detective Noir',
      description: 'Grit, world-weary cynicism, and close-mic voice projection.',
      characterName: 'Detective Kabir Vane',
      script: 'Rain on neon pavement. Another night where the shadows talk louder than the truth. Keep your eyes sharp.',
      difficulty: 'Intermediate',
      targetRank: 'B',
      tags: ['Noir', 'Gaming', 'Deep Baritone', 'Cinematic'],
      isActive: true,
      createdBy: adminUser._id,
    },
    {
      title: 'Magical Companion Mascot',
      description: 'Energetic comic timing with whimsical pitch agility.',
      characterName: 'Pippin the Sprite',
      script: 'Watch out behind you! If that crystal drops, the whole sky kingdom turns into giant turnips!',
      difficulty: 'Beginner',
      targetRank: 'ED',
      tags: ['Animation', 'Comedy', 'High Pitch', 'Child Friendly'],
      isActive: true,
      createdBy: adminUser._id,
    },
  ];

  for (const c of initialChallenges) {
    await Challenge.findOneAndUpdate(
      { title: c.title },
      c,
      { upsert: true, new: true }
    );
  }

  // 3. Purge any legacy static dummy accounts (e.g., @pdi.academy)
  const dummyUsers = await User.find({
    email: { $in: ['admin@pdi.academy', 'director@pdi.academy', /@pdi\.academy$/i] },
    _id: { $ne: adminUser._id },
  });

  for (const dUser of dummyUsers) {
    await ArtistProfile.deleteMany({ userId: dUser._id });
    await User.findByIdAndDelete(dUser._id);
    console.log(`[PDI Seed] Purged static user: ${dUser.email}`);
  }

  console.log('[PDI Seed] Clean setup completed: No static user data created.');
  console.log(`Authoritative Admin: ${adminUser.email}`);
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[PDI Seed Error]:', err);
      await disconnectDB();
      process.exit(1);
    });
}
