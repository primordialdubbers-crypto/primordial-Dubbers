export type Role = 'student' | 'director' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'suspended' | 'pending_verification';
export type RankTier = 'ED' | 'C' | 'B' | 'A' | 'S';
export interface UserSummary {
    id: string;
    email: string;
    displayName: string;
    roles: Role[];
    status: UserStatus;
    createdAt: string;
}
export type ProfileType = 'student' | 'staff';
export interface StaffLeaderboardEntry {
    id: string;
    userId: string;
    displayName: string;
    email?: string;
    currentRank: RankTier;
    staffDesignation: string;
    rankPoints: number;
    roles: Role[];
    reviewsConducted?: number;
    bio?: string;
    createdAt?: string;
}
export interface ArtistProfileSummary {
    userId: string;
    displayName: string;
    bio?: string;
    voiceTypes: string[];
    languages?: string[];
    publicOptIn: boolean;
    rankPoints: number;
    currentRank: RankTier;
    performanceAverage: number;
    milestones?: MilestoneBadge[];
    profileType?: ProfileType;
    staffDesignation?: string;
}
export type PointProposalStatus = 'pending' | 'approved' | 'rejected';
export type PointSourceType = 'review' | 'manual_award' | 'manual_deduction' | 'challenge' | 'appeal_reversal';
export interface PointTransactionRecord {
    id: string;
    studentId: string;
    proposalId?: string | null;
    delta: number;
    balanceBefore: number;
    balanceAfter: number;
    actorId: string;
    actorName?: string;
    reason: string;
    category: string;
    sourceId?: string;
    reversalOf?: string | null;
    idempotencyKey: string;
    createdAt: string;
}
export interface PointProposalRecord {
    id: string;
    studentId: string;
    studentName?: string;
    reviewId?: string | null;
    sourceType: PointSourceType;
    sourceId?: string;
    delta: number;
    category: string;
    reason: string;
    evidenceIds?: string[];
    status: PointProposalStatus;
    requestedBy: string;
    requesterName?: string;
    decidedBy?: string | null;
    deciderName?: string | null;
    decidedAt?: string | null;
    decisionNote?: string;
    policyVersion?: string;
    idempotencyKey: string;
    createdAt: string;
    updatedAt: string;
}
export interface RankEventRecord {
    id: string;
    studentId: string;
    oldRank: RankTier;
    newRank: RankTier;
    pointsAtEvent: number;
    triggeringTransactionId: string;
    createdAt: string;
}
export interface PointsSummaryResponse {
    currentPoints: number;
    currentRank: RankTier;
    nextRank: RankTier | null;
    pointsToNextRank: number;
    rankProgressPercent: number;
    transactions: PointTransactionRecord[];
    totalEarned: number;
    totalDeducted: number;
}
export interface AuthSessionResponse {
    user: UserSummary;
    profile?: ArtistProfileSummary;
    token: string;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        details?: unknown;
    };
}
export type AppealStatus = 'pending' | 'granted' | 'rejected';
export interface AppealRecord {
    id: string;
    studentId: string;
    studentName?: string;
    studentEmail?: string;
    transactionId: string;
    transactionDelta?: number;
    transactionReason?: string;
    transactionCategory?: string;
    reason: string;
    evidenceText?: string;
    status: AppealStatus;
    decidedBy?: string | null;
    deciderName?: string | null;
    decidedAt?: string | null;
    decisionNote?: string;
    reversalTransactionId?: string | null;
    createdAt: string;
    updatedAt: string;
}
export type ChallengeDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
export interface AssignedStudentInfo {
    id: string;
    displayName: string;
    email?: string;
    currentRank?: RankTier;
}
export interface ChallengeRecord {
    id: string;
    title: string;
    description: string;
    characterName: string;
    script: string;
    difficulty: ChallengeDifficulty;
    targetRank: RankTier;
    referenceMediaUrl?: string;
    deadline?: string | null;
    isActive: boolean;
    tags: string[];
    assignedStudentIds?: string[];
    assignedStudents?: AssignedStudentInfo[];
    isPersonal?: boolean;
    isAssignedToMe?: boolean;
    createdBy: string;
    creatorName?: string;
    createdAt: string;
    updatedAt: string;
}
export type SubmissionType = 'recorded' | 'uploaded';
export type SubmissionStatus = 'submitted' | 'reviewed' | 'approved' | 'rejected';
export interface SubmissionRecord {
    id: string;
    studentId: string;
    studentName?: string;
    challengeId?: string | null;
    challengeTitle?: string;
    customTitle?: string;
    characterName?: string;
    difficulty?: ChallengeDifficulty;
    targetRank?: RankTier;
    audioUrl: string;
    videoUrl?: string;
    durationSeconds: number;
    mimeType: string;
    submissionType: SubmissionType;
    syncOffsetMs?: number;
    status: SubmissionStatus;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface RubricScores {
    acting: number;
    timing: number;
    pronunciation: number;
    expression: number;
    audio: number;
}
export interface TimestampComment {
    timestampSeconds: number;
    comment: string;
}
export type EvaluationStatus = 'draft' | 'submitted';
export interface EvaluationRecord {
    id: string;
    submissionId: string;
    directorId: string;
    directorName?: string;
    studentId: string;
    studentName?: string;
    challengeId: string;
    challengeTitle?: string;
    characterName?: string;
    scores: RubricScores;
    totalScore: number;
    grade?: string;
    timestampComments: TimestampComment[];
    summaryNotes?: string;
    strengths?: string;
    areasForImprovement?: string;
    status: EvaluationStatus;
    pointProposalId?: string | null;
    createdAt: string;
    updatedAt: string;
}
export type NotificationType = 'rank_change' | 'points_awarded' | 'appeal_resolved' | 'evaluation_ready' | 'system';
export interface NotificationRecord {
    id: string;
    recipientId: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    linkUrl?: string;
    createdAt: string;
}
export interface NotificationsResponse {
    notifications: NotificationRecord[];
    unreadCount: number;
}
export interface TalentQueryFilters {
    rank?: RankTier;
    voiceType?: string;
    language?: string;
    minPoints?: number;
    search?: string;
    page?: number;
    limit?: number;
}
export interface TalentRecord {
    userId: string;
    displayName: string;
    email?: string;
    bio?: string;
    voiceTypes: string[];
    languages?: string[];
    currentRank: RankTier;
    rankPoints: number;
    performanceAverage: number;
    publicOptIn: boolean;
    sampleAudioUrl?: string;
    totalSubmissions?: number;
    approvedSubmissions?: number;
    createdAt?: string;
}
export interface TalentListResponse {
    talents: TalentRecord[];
    total: number;
    page: number;
    totalPages: number;
}
export interface MilestoneBadge {
    id: string;
    name: string;
    category: 'rank' | 'auditions' | 'performance';
    description: string;
    icon: string;
    unlocked: boolean;
    currentValue: number;
    targetValue: number;
    unit: string;
}
export interface AdminUserRecord extends UserSummary {
    currentRank: RankTier;
    rankPoints: number;
    profileType?: ProfileType;
    staffDesignation?: string | null;
}
export interface AdminUserListResponse {
    users: AdminUserRecord[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
//# sourceMappingURL=index.d.ts.map