import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import {
  User,
  ArtistProfile,
  Challenge,
  Submission,
  Evaluation,
  Notification,
} from '../models/index.js';
import { calculateRankFromPoints } from '@pdi/shared';

export async function seedDatabase(mongoUri?: string) {
  const uri = mongoUri || config.mongodbUri;
  console.log(`[PDI Seed] Connecting to MongoDB: ${uri}`);
  await connectDB(uri);

  console.log('[PDI Seed] Preparing demo users, artist profiles, challenges, evaluations, and notifications...');

  const salt = await bcrypt.genSalt(10);
  const adminEmail = (config.adminDefaultEmail || 'admin@pdi.academy').toLowerCase().trim();
  const adminPassword = config.adminDefaultPassword || 'Admin@123456';
  const adminPasswordHash = await bcrypt.hash(adminPassword, salt);
  const directorPasswordHash = await bcrypt.hash('DirectorPass123!', salt);
  const studentPasswordHash = await bcrypt.hash('StudentPass123!', salt);

  // 1. Seed Administrator
  const adminUser = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      email: adminEmail,
      displayName: 'PDI Senior Administrator',
      passwordHash: adminPasswordHash,
      roles: ['admin', 'superadmin'],
      status: 'active',
    },
    { upsert: true, new: true }
  );

  // 2. Seed Casting Director
  const directorUser = await User.findOneAndUpdate(
    { email: 'director@pdi.academy' },
    {
      email: 'director@pdi.academy',
      displayName: 'Rajesh Sharma (Casting Director)',
      passwordHash: directorPasswordHash,
      roles: ['director'],
      status: 'active',
    },
    { upsert: true, new: true }
  );

  // 3. Seed Demo Challenges
  const challenges = [
    {
      title: 'Shonen Awakening Monologue',
      description: 'High-octane climax speech delivering raw battle determination and emotional range.',
      characterName: 'Renjiro the Firebrand',
      script: 'You think you can extinguish this flame? As long as my voice can reach the sky, my blade will never shatter!',
      difficulty: 'Advanced',
      targetRank: 'A',
      tags: ['Anime', 'Action', 'Shonen', 'High Intensity'],
      isActive: true,
      createdBy: directorUser._id,
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
      createdBy: directorUser._id,
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
      createdBy: directorUser._id,
    },
  ];

  const seededChallenges = [];
  for (const c of challenges) {
    const ch = await Challenge.findOneAndUpdate(
      { title: c.title },
      c,
      { upsert: true, new: true }
    );
    seededChallenges.push(ch);
  }

  // 4. Seed Voice Artists across rank spectrum (ED, C, B, A, S)
  const demoArtists = [
    {
      email: 'aarav@pdi.academy',
      displayName: 'Aarav Sharma',
      points: 28450,
      voiceTypes: ['Heroic Lead', 'Deep Baritone', 'Action Anime'],
      languages: ['Hindi', 'English', 'Japanese'],
      avg: 96.2,
      bio: 'Professional voice artist with 5+ years experience in shonen anime and cinematic game dubbing.',
      sampleAudio: 'https://actions.google.com/sounds/v1/human_voices/applause_and_cheering.ogg',
    },
    {
      email: 'pooja@pdi.academy',
      displayName: 'Pooja Iyer',
      points: 25100,
      voiceTypes: ['Anime Heroine', 'Young Adult', 'Documentary Narrator'],
      languages: ['English', 'Tamil', 'Hindi'],
      avg: 94.8,
      bio: 'Bilingual voice talent specializing in character expressions and lip-sync synchronization.',
      sampleAudio: 'https://actions.google.com/sounds/v1/human_voices/human_female_scream.ogg',
    },
    {
      email: 'vikram@pdi.academy',
      displayName: 'Vikramaditya Roy',
      points: 19800,
      voiceTypes: ['Villainous', 'Deep Antagonist', 'Corporate Voiceover'],
      languages: ['Hindi', 'Bengali', 'English'],
      avg: 91.5,
      bio: 'Stage actor turned dubber; passionate about dark fantasy and villain monologue delivery.',
      sampleAudio: 'https://actions.google.com/sounds/v1/human_voices/male_heavy_sigh.ogg',
    },
    {
      email: 'meera@pdi.academy',
      displayName: 'Meera Nambiar',
      points: 14200,
      voiceTypes: ['Warm Alto', 'Commercial Ad', 'Warm Motherly'],
      languages: ['English', 'Malayalam', 'Hindi'],
      avg: 88.0,
      bio: 'Commercial and animated series specialist with over 40 dubbed ad spots.',
      sampleAudio: 'https://actions.google.com/sounds/v1/human_voices/human_female_snort_laugh.ogg',
    },
    {
      email: 'kabir@pdi.academy',
      displayName: 'Kabir Verma',
      points: 8900,
      voiceTypes: ['Teen Energetic', 'Comic Relief Sidekick'],
      languages: ['Hindi', 'English'],
      avg: 85.3,
      bio: 'Fast-paced comedic timing and high-range energetic character delivery.',
      sampleAudio: 'https://actions.google.com/sounds/v1/human_voices/male_whistle_loud.ogg',
    },
    {
      email: 'ananya@pdi.academy',
      displayName: 'Ananya Sen',
      points: 3400,
      voiceTypes: ['Ingénue', 'Child / Mascot', 'High Pitch'],
      languages: ['Bengali', 'Hindi', 'English'],
      avg: 79.4,
      bio: 'Up-and-coming voice artist refining lip-sync techniques and accent calibration.',
      sampleAudio: 'https://actions.google.com/sounds/v1/human_voices/human_female_gasp_delight.ogg',
    },
    {
      email: 'rohan@pdi.academy',
      displayName: 'Rohan Deshmukh',
      points: 650,
      voiceTypes: ['Beginner', 'Character Voice'],
      languages: ['Marathi', 'Hindi', 'English'],
      avg: 72.1,
      bio: 'PDI Academy newcomer practicing foundational voice projection and breath control.',
      sampleAudio: 'https://actions.google.com/sounds/v1/human_voices/male_gasp_delight.ogg',
    },
  ];

  for (let i = 0; i < demoArtists.length; i++) {
    const item = demoArtists[i];
    const user = await User.findOneAndUpdate(
      { email: item.email },
      {
        email: item.email,
        displayName: item.displayName,
        passwordHash: studentPasswordHash,
        roles: ['student'],
        status: 'active',
      },
      { upsert: true, new: true }
    );

    const calculatedRank = calculateRankFromPoints(item.points);

    await ArtistProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        displayName: item.displayName,
        rankPoints: item.points,
        currentRank: calculatedRank,
        performanceAverage: item.avg,
        voiceTypes: item.voiceTypes,
        languages: item.languages,
        bio: item.bio,
        publicOptIn: true,
        version: 1,
      },
      { upsert: true, new: true }
    );

    // 5. Seed Submissions & Evaluations for each demo artist
    const challenge = seededChallenges[i % seededChallenges.length];
    const submission = await Submission.findOneAndUpdate(
      { studentId: user._id, challengeId: challenge._id },
      {
        studentId: user._id,
        challengeId: challenge._id,
        audioUrl: item.sampleAudio,
        durationSeconds: 24,
        mimeType: 'audio/ogg',
        submissionType: 'recorded',
        status: 'reviewed',
        notes: `Audition take by ${item.displayName}`,
      },
      { upsert: true, new: true }
    );

    // Director Evaluation
    await Evaluation.findOneAndUpdate(
      { submissionId: submission._id },
      {
        submissionId: submission._id,
        directorId: directorUser._id,
        studentId: user._id,
        challengeId: challenge._id,
        scores: {
          acting: 23,
          timing: 19,
          pronunciation: 19,
          expression: 19,
          audio: 14,
        },
        totalScore: Math.round(item.avg * 10) / 10,
        grade: item.avg >= 90 ? 'S (Exceptional)' : item.avg >= 80 ? 'A (Proficient)' : 'B (Competent)',
        summaryNotes: `Demonstrated superb character resonance, tight lip sync alignment, and dynamic vocal inflection on "${challenge.characterName}".`,
        strengths: 'Excellent pacing, dynamic mic technique, authentic expression.',
        areasForImprovement: 'Minor sibilance in plosives on high emotion lines.',
        status: 'submitted',
      },
      { upsert: true, new: true }
    );

    // 6. Seed In-App Notifications
    await Notification.deleteMany({ recipientId: user._id });

    await Notification.create([
      {
        recipientId: user._id,
        title: `Rank Milestone: ${calculatedRank} Tier`,
        message: `Welcome to Rank ${calculatedRank}! Your authoritative profile currently holds ${item.points.toLocaleString()} PTS.`,
        type: 'rank_change',
        read: false,
        linkUrl: '/student/ledger',
      },
      {
        recipientId: user._id,
        title: 'Points Awarded: Studio Audition',
        message: `+50 PTS awarded by Rajesh Sharma for outstanding delivery on "${challenge.title}".`,
        type: 'points_awarded',
        read: false,
        linkUrl: '/student/ledger',
      },
      {
        recipientId: user._id,
        title: 'Audition Evaluation Ready',
        message: `Director evaluation completed for "${challenge.title}" (Score: ${item.avg}/100).`,
        type: 'evaluation_ready',
        read: true,
        linkUrl: '/student/submissions',
      },
    ]);
  }

  console.log('[PDI Seed] Database successfully seeded with demo accounts & Phase 7/8 content:');
  console.log('------------------------------------------------------------');
  console.log(`1. Admin:    ${adminEmail}    / ${adminPassword}   [Role: admin, superadmin]`);
  console.log('2. Director: director@pdi.academy / DirectorPass123![Role: director]');
  console.log('3. Student S:aarav@pdi.academy    / StudentPass123! [Role: student - S Rank]');
  console.log('4. Student ED:rohan@pdi.academy   / StudentPass123! [Role: student - ED Rank]');
  console.log('Challenges, Submissions, Director Evaluations, & Notifications ready.');
  console.log('------------------------------------------------------------');
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
