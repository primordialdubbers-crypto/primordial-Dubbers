export const RANK_TIERS = {
    ED: {
        tier: 'ED',
        minPoints: 0,
        maxPoints: 999,
        title: 'ED Rank',
        level: 'Entry / Beginner',
        colorHex: '#8A99AD',
    },
    C: {
        tier: 'C',
        minPoints: 1000,
        maxPoints: 4999,
        title: 'C Rank',
        level: 'Developing Artist',
        colorHex: '#4E97C2',
    },
    B: {
        tier: 'B',
        minPoints: 5000,
        maxPoints: 11999,
        title: 'B Rank',
        level: 'Intermediate Artist',
        colorHex: '#168DFF',
    },
    A: {
        tier: 'A',
        minPoints: 12000,
        maxPoints: 24999,
        title: 'A Rank',
        level: 'Advanced Artist',
        colorHex: '#D5A02E',
    },
    S: {
        tier: 'S',
        minPoints: 25000,
        maxPoints: Number.MAX_SAFE_INTEGER,
        title: 'S Rank',
        level: 'Elite / Professional Artist',
        colorHex: '#D95436',
    },
};
export const S_RANK_DISPLAY_MILESTONE = 50000;
export function calculateRankFromPoints(points) {
    const safePoints = Math.max(0, points);
    if (safePoints >= RANK_TIERS.S.minPoints)
        return 'S';
    if (safePoints >= RANK_TIERS.A.minPoints)
        return 'A';
    if (safePoints >= RANK_TIERS.B.minPoints)
        return 'B';
    if (safePoints >= RANK_TIERS.C.minPoints)
        return 'C';
    return 'ED';
}
export function getRankProgress(points) {
    const safePoints = Math.max(0, points);
    const currentTier = calculateRankFromPoints(safePoints);
    if (currentTier === 'ED') {
        const target = RANK_TIERS.C.minPoints;
        const progress = Math.min(100, Math.max(0, Math.round((safePoints / target) * 100)));
        return {
            currentTier,
            nextTier: 'C',
            currentPoints: safePoints,
            pointsToNextTier: target - safePoints,
            progressPercent: progress,
        };
    }
    if (currentTier === 'C') {
        const base = RANK_TIERS.C.minPoints;
        const target = RANK_TIERS.B.minPoints;
        const progress = Math.min(100, Math.max(0, Math.round(((safePoints - base) / (target - base)) * 100)));
        return {
            currentTier,
            nextTier: 'B',
            currentPoints: safePoints,
            pointsToNextTier: target - safePoints,
            progressPercent: progress,
        };
    }
    if (currentTier === 'B') {
        const base = RANK_TIERS.B.minPoints;
        const target = RANK_TIERS.A.minPoints;
        const progress = Math.min(100, Math.max(0, Math.round(((safePoints - base) / (target - base)) * 100)));
        return {
            currentTier,
            nextTier: 'A',
            currentPoints: safePoints,
            pointsToNextTier: target - safePoints,
            progressPercent: progress,
        };
    }
    if (currentTier === 'A') {
        const base = RANK_TIERS.A.minPoints;
        const target = RANK_TIERS.S.minPoints;
        const progress = Math.min(100, Math.max(0, Math.round(((safePoints - base) / (target - base)) * 100)));
        return {
            currentTier,
            nextTier: 'S',
            currentPoints: safePoints,
            pointsToNextTier: target - safePoints,
            progressPercent: progress,
        };
    }
    // S Tier (Milestone: 50,000 points)
    const base = RANK_TIERS.S.minPoints;
    const milestone = S_RANK_DISPLAY_MILESTONE;
    const progress = Math.min(100, Math.max(0, Math.round(((safePoints - base) / (milestone - base)) * 100)));
    return {
        currentTier: 'S',
        nextTier: null,
        currentPoints: safePoints,
        pointsToNextTier: 0,
        progressPercent: progress,
    };
}
export const AWARDS_CATALOG = [
    { code: 'AUDITION_SUBMITTED', name: 'Audition Submitted', points: 20 },
    { code: 'TRAINING_COMPLETED', name: 'Training Session Completed', points: 50 },
    { code: 'EXCELLENT_REVIEW', name: 'Excellent Performance Review', points: 50 },
    { code: 'ROLE_APPROVED', name: 'Approved Dubbing Role', points: 100 },
    { code: 'SCENE_MASTERY', name: 'Difficult Scene Mastery', points: 100 },
    { code: 'CONSISTENCY_MILESTONE', name: 'Quality & Consistency Milestone', points: 200 },
];
export const DEDUCTIONS_CATALOG = [
    { code: 'PRONUNCIATION_MINOR', name: 'Minor pronunciation issue', points: -10 },
    { code: 'LIP_SYNC_REPEATED', name: 'Repeated lip sync issue', points: -20 },
    { code: 'AUDIO_QUALITY_WARN', name: 'Audio quality after warning', points: -25 },
    { code: 'DEADLINE_MISSED', name: 'Missed approved deadline', points: -30 },
    { code: 'INCOMPLETE_SUBMISSION', name: 'Repeated incomplete submission', points: -40 },
];
export const REVIEW_RUBRIC_MAX = {
    acting: 25,
    timing: 20,
    pronunciation: 20,
    expression: 20,
    audio: 15,
};
export function calculateEvaluationGrade(totalScore) {
    if (totalScore >= 90)
        return 'S (Exceptional)';
    if (totalScore >= 80)
        return 'A (Proficient)';
    if (totalScore >= 70)
        return 'B (Competent)';
    if (totalScore >= 60)
        return 'C (Developing)';
    return 'Needs Work';
}
export const THEME_TOKENS = {
    cinematicDark: {
        background: '#080D17',
        surface: '#121D30',
        border: '#1E2C45',
        textPrimary: '#F8FAFC',
        textMuted: '#94A3B8',
    },
    // Combo 03: Charcoal Violet & Cyber Lime (Student & Studio Theme)
    userTheme: {
        charcoalViolet: '#3C1A47',
        cyberLime: '#B6FF00',
        primary: '#B6FF00',
        container: '#3C1A47',
    },
    // Combo 05: Fresh Canopy & Lime Sprout (Admin & Governance Theme)
    adminTheme: {
        freshCanopy: '#2D3E2C',
        limeSprout: '#E4FD97',
        primary: '#E4FD97',
        container: '#2D3E2C',
    },
    ranks: {
        ED: '#8A99AD',
        C: '#4E97C2',
        B: '#168DFF',
        A: '#D5A02E',
        S: '#D95436',
    },
};
export function calculateArtistMilestones(profile, auditionsCount = 0) {
    const points = Math.max(0, profile?.rankPoints || 0);
    const count = Math.max(0, auditionsCount || 0);
    return [
        {
            id: 'cadet_voice',
            name: 'Cadet Voice',
            category: 'rank',
            description: 'Initiated voice acting journey in PDI Academy.',
            icon: 'Shield',
            unlocked: true,
            currentValue: points,
            targetValue: 0,
            unit: 'pts',
        },
        {
            id: 'rising_talent',
            name: 'Rising Talent',
            category: 'rank',
            description: 'Attained Rank C (1,000+ pts). Demonstrates character agility.',
            icon: 'TrendingUp',
            unlocked: points >= 1000,
            currentValue: Math.min(points, 1000),
            targetValue: 1000,
            unit: 'pts',
        },
        {
            id: 'studio_regular',
            name: 'Studio Regular',
            category: 'rank',
            description: 'Attained Rank B (5,000+ pts). Proven vocal dynamics.',
            icon: 'Mic',
            unlocked: points >= 5000,
            currentValue: Math.min(points, 5000),
            targetValue: 5000,
            unit: 'pts',
        },
        {
            id: 'pro_performer',
            name: 'Pro Performer',
            category: 'rank',
            description: 'Attained Rank A (12,000+ pts). Advanced dubbing and sync mastery.',
            icon: 'Award',
            unlocked: points >= 12000,
            currentValue: Math.min(points, 12000),
            targetValue: 12000,
            unit: 'pts',
        },
        {
            id: 'elite_legend',
            name: 'Elite Legend',
            category: 'rank',
            description: 'Attained Rank S (25,000+ pts). Industry-ready master dubber.',
            icon: 'Crown',
            unlocked: points >= 25000,
            currentValue: Math.min(points, 25000),
            targetValue: 25000,
            unit: 'pts',
        },
        {
            id: 'first_take',
            name: 'First Take',
            category: 'auditions',
            description: 'Submitted 1st verified studio audition challenge.',
            icon: 'Sparkles',
            unlocked: count >= 1,
            currentValue: Math.min(count, 1),
            targetValue: 1,
            unit: 'auditions',
        },
        {
            id: 'scene_stealer',
            name: 'Scene Stealer',
            category: 'auditions',
            description: 'Completed 5 verified studio audition challenges.',
            icon: 'Film',
            unlocked: count >= 5,
            currentValue: Math.min(count, 5),
            targetValue: 5,
            unit: 'auditions',
        },
        {
            id: 'dubbing_virtuoso',
            name: 'Dubbing Virtuoso',
            category: 'auditions',
            description: 'Completed 10+ studio auditions and evaluations.',
            icon: 'Flame',
            unlocked: count >= 10,
            currentValue: Math.min(count, 10),
            targetValue: 10,
            unit: 'auditions',
        },
    ];
}
//# sourceMappingURL=index.js.map