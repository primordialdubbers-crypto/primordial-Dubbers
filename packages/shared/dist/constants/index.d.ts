import { RankTier, MilestoneBadge } from '../types/index.js';
export interface RankDefinition {
    tier: RankTier;
    minPoints: number;
    maxPoints: number;
    title: string;
    level: string;
    colorHex: string;
}
export declare const RANK_TIERS: Record<RankTier, RankDefinition>;
export declare const S_RANK_DISPLAY_MILESTONE = 100000;
export interface StaffRankDefinition {
    tier: RankTier;
    designation: string;
    minPoints: number;
    maxPoints: number;
    level: string;
    colorHex: string;
}
export declare const STAFF_RANK_TIERS: Record<RankTier, StaffRankDefinition>;
export declare function calculateStaffRankFromPoints(points: number): {
    tier: RankTier;
    designation: string;
};
export declare function calculateRankFromPoints(points: number): RankTier;
export interface RankProgressInfo {
    currentTier: RankTier;
    nextTier: RankTier | null;
    currentPoints: number;
    pointsToNextTier: number;
    progressPercent: number;
}
export declare function getRankProgress(points: number): RankProgressInfo;
export declare const AWARDS_CATALOG: readonly [{
    readonly code: "AUDITION_SUBMITTED";
    readonly name: "Audition Submitted";
    readonly points: 20;
}, {
    readonly code: "TRAINING_COMPLETED";
    readonly name: "Training Session Completed";
    readonly points: 50;
}, {
    readonly code: "EXCELLENT_REVIEW";
    readonly name: "Excellent Performance Review";
    readonly points: 50;
}, {
    readonly code: "ROLE_APPROVED";
    readonly name: "Approved Dubbing Role";
    readonly points: 100;
}, {
    readonly code: "SCENE_MASTERY";
    readonly name: "Difficult Scene Mastery";
    readonly points: 100;
}, {
    readonly code: "CONSISTENCY_MILESTONE";
    readonly name: "Quality & Consistency Milestone";
    readonly points: 200;
}];
export declare const STAFF_AWARDS_CATALOG: readonly [{
    readonly code: "STAFF_REVIEW_TIMELY";
    readonly name: "Timely Audition Review & Scoring";
    readonly points: 50;
    readonly category: "evaluation";
}, {
    readonly code: "STAFF_CASTING_MATCH";
    readonly name: "Successful Talent Casting & Role Match";
    readonly points: 100;
    readonly category: "casting";
}, {
    readonly code: "STAFF_QC_AUDIT";
    readonly name: "Script & Dubbing Audio QC Audit";
    readonly points: 75;
    readonly category: "quality_control";
}, {
    readonly code: "STAFF_STUDENT_MENTOR";
    readonly name: "Student Workshop & Mentorship";
    readonly points: 150;
    readonly category: "mentorship";
}, {
    readonly code: "STAFF_ADMIN_MERIT";
    readonly name: "Executive Administrative Excellence";
    readonly points: 200;
    readonly category: "governance";
}];
export declare const DEDUCTIONS_CATALOG: readonly [{
    readonly code: "PRONUNCIATION_MINOR";
    readonly name: "Minor pronunciation issue";
    readonly points: -10;
}, {
    readonly code: "LIP_SYNC_REPEATED";
    readonly name: "Repeated lip sync issue";
    readonly points: -20;
}, {
    readonly code: "AUDIO_QUALITY_WARN";
    readonly name: "Audio quality after warning";
    readonly points: -25;
}, {
    readonly code: "DEADLINE_MISSED";
    readonly name: "Missed approved deadline";
    readonly points: -30;
}, {
    readonly code: "INCOMPLETE_SUBMISSION";
    readonly name: "Repeated incomplete submission";
    readonly points: -40;
}];
export declare const REVIEW_RUBRIC_MAX: {
    readonly acting: 25;
    readonly timing: 20;
    readonly pronunciation: 20;
    readonly expression: 20;
    readonly audio: 15;
};
export declare function calculateEvaluationGrade(totalScore: number): string;
export declare const THEME_TOKENS: {
    readonly cinematicDark: {
        readonly background: "#080D17";
        readonly surface: "#121D30";
        readonly border: "#1E2C45";
        readonly textPrimary: "#F8FAFC";
        readonly textMuted: "#94A3B8";
    };
    readonly userTheme: {
        readonly charcoalViolet: "#3C1A47";
        readonly cyberLime: "#B6FF00";
        readonly primary: "#B6FF00";
        readonly container: "#3C1A47";
    };
    readonly adminTheme: {
        readonly freshCanopy: "#2D3E2C";
        readonly limeSprout: "#E4FD97";
        readonly primary: "#E4FD97";
        readonly container: "#2D3E2C";
    };
    readonly ranks: {
        readonly ED: "#8A99AD";
        readonly C: "#4E97C2";
        readonly B: "#168DFF";
        readonly A: "#D5A02E";
        readonly S: "#D95436";
    };
};
export declare function calculateArtistMilestones(profile: {
    rankPoints: number;
    currentRank?: RankTier;
    performanceAverage?: number;
}, auditionsCount?: number): MilestoneBadge[];
//# sourceMappingURL=index.d.ts.map