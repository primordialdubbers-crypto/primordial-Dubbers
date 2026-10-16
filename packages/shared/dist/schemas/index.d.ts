import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
    requestedRole: z.ZodDefault<z.ZodOptional<z.ZodEnum<["student", "director", "admin"]>>>;
    adminInviteToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    displayName: string;
    requestedRole: "student" | "director" | "admin";
    adminInviteToken?: string | undefined;
}, {
    email: string;
    password: string;
    displayName: string;
    requestedRole?: "student" | "director" | "admin" | undefined;
    adminInviteToken?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    email: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    newPassword: string;
}, {
    email: string;
    newPassword: string;
}>;
export declare const adminResetPasswordSchema: z.ZodObject<{
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
}, {
    newPassword: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    voiceTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    publicOptIn: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    bio?: string | undefined;
    voiceTypes?: string[] | undefined;
    languages?: string[] | undefined;
    publicOptIn?: boolean | undefined;
}, {
    displayName?: string | undefined;
    bio?: string | undefined;
    voiceTypes?: string[] | undefined;
    languages?: string[] | undefined;
    publicOptIn?: boolean | undefined;
}>;
export declare const createPointTransactionSchema: z.ZodObject<{
    studentId: z.ZodString;
    delta: z.ZodEffects<z.ZodNumber, number, number>;
    reason: z.ZodString;
    category: z.ZodString;
    sourceId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    studentId: string;
    delta: number;
    reason: string;
    category: string;
    idempotencyKey: string;
    sourceId?: string | undefined;
}, {
    studentId: string;
    delta: number;
    reason: string;
    category: string;
    idempotencyKey: string;
    sourceId?: string | undefined;
}>;
export declare const createPointProposalSchema: z.ZodObject<{
    studentId: z.ZodString;
    delta: z.ZodEffects<z.ZodNumber, number, number>;
    category: z.ZodString;
    reason: z.ZodString;
    sourceType: z.ZodDefault<z.ZodEnum<["review", "manual_award", "manual_deduction", "challenge", "appeal_reversal"]>>;
    sourceId: z.ZodOptional<z.ZodString>;
    evidenceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    studentId: string;
    delta: number;
    reason: string;
    category: string;
    idempotencyKey: string;
    sourceType: "review" | "manual_award" | "manual_deduction" | "challenge" | "appeal_reversal";
    sourceId?: string | undefined;
    evidenceIds?: string[] | undefined;
}, {
    studentId: string;
    delta: number;
    reason: string;
    category: string;
    idempotencyKey: string;
    sourceId?: string | undefined;
    sourceType?: "review" | "manual_award" | "manual_deduction" | "challenge" | "appeal_reversal" | undefined;
    evidenceIds?: string[] | undefined;
}>;
export declare const decidePointProposalSchema: z.ZodObject<{
    decision: z.ZodEnum<["approve", "reject"]>;
    decisionNote: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    decision: "approve" | "reject";
    decisionNote?: string | undefined;
}, {
    decision: "approve" | "reject";
    decisionNote?: string | undefined;
}>;
export declare const createAppealSchema: z.ZodObject<{
    transactionId: z.ZodString;
    reason: z.ZodString;
    evidenceText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    transactionId: string;
    evidenceText?: string | undefined;
}, {
    reason: string;
    transactionId: string;
    evidenceText?: string | undefined;
}>;
export declare const resolveAppealSchema: z.ZodObject<{
    decision: z.ZodEnum<["grant", "reject", "granted", "rejected"]>;
    decisionNote: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    decision: "rejected" | "granted" | "reject" | "grant";
    decisionNote?: string | undefined;
}, {
    decision: "rejected" | "granted" | "reject" | "grant";
    decisionNote?: string | undefined;
}>;
export declare const createChallengeSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    characterName: z.ZodString;
    script: z.ZodString;
    difficulty: z.ZodDefault<z.ZodEnum<["Beginner", "Intermediate", "Advanced", "Master"]>>;
    targetRank: z.ZodDefault<z.ZodEnum<["ED", "C", "B", "A", "S"]>>;
    referenceMediaUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    deadline: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    assignedStudentIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    isPersonal: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    characterName: string;
    script: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced" | "Master";
    targetRank: "ED" | "C" | "B" | "A" | "S";
    isActive: boolean;
    tags: string[];
    assignedStudentIds: string[];
    isPersonal: boolean;
    referenceMediaUrl?: string | undefined;
    deadline?: string | null | undefined;
}, {
    title: string;
    description: string;
    characterName: string;
    script: string;
    difficulty?: "Beginner" | "Intermediate" | "Advanced" | "Master" | undefined;
    targetRank?: "ED" | "C" | "B" | "A" | "S" | undefined;
    referenceMediaUrl?: string | undefined;
    deadline?: string | null | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    assignedStudentIds?: string[] | undefined;
    isPersonal?: boolean | undefined;
}>;
export declare const updateChallengeSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    characterName: z.ZodOptional<z.ZodString>;
    script: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodOptional<z.ZodDefault<z.ZodEnum<["Beginner", "Intermediate", "Advanced", "Master"]>>>;
    targetRank: z.ZodOptional<z.ZodDefault<z.ZodEnum<["ED", "C", "B", "A", "S"]>>>;
    referenceMediaUrl: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    deadline: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
    assignedStudentIds: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
    isPersonal: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | undefined;
    characterName?: string | undefined;
    script?: string | undefined;
    difficulty?: "Beginner" | "Intermediate" | "Advanced" | "Master" | undefined;
    targetRank?: "ED" | "C" | "B" | "A" | "S" | undefined;
    referenceMediaUrl?: string | undefined;
    deadline?: string | null | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    assignedStudentIds?: string[] | undefined;
    isPersonal?: boolean | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    characterName?: string | undefined;
    script?: string | undefined;
    difficulty?: "Beginner" | "Intermediate" | "Advanced" | "Master" | undefined;
    targetRank?: "ED" | "C" | "B" | "A" | "S" | undefined;
    referenceMediaUrl?: string | undefined;
    deadline?: string | null | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    assignedStudentIds?: string[] | undefined;
    isPersonal?: boolean | undefined;
}>;
export declare const createSubmissionSchema: z.ZodObject<{
    challengeId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customTitle: z.ZodOptional<z.ZodString>;
    characterName: z.ZodOptional<z.ZodString>;
    audioUrl: z.ZodString;
    videoUrl: z.ZodOptional<z.ZodString>;
    durationSeconds: z.ZodNumber;
    mimeType: z.ZodEffects<z.ZodString, string, string>;
    submissionType: z.ZodDefault<z.ZodEnum<["recorded", "uploaded"]>>;
    syncOffsetMs: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    audioUrl: string;
    durationSeconds: number;
    mimeType: string;
    submissionType: "recorded" | "uploaded";
    syncOffsetMs: number;
    characterName?: string | undefined;
    challengeId?: string | null | undefined;
    customTitle?: string | undefined;
    videoUrl?: string | undefined;
    notes?: string | undefined;
}, {
    audioUrl: string;
    durationSeconds: number;
    mimeType: string;
    characterName?: string | undefined;
    challengeId?: string | null | undefined;
    customTitle?: string | undefined;
    videoUrl?: string | undefined;
    submissionType?: "recorded" | "uploaded" | undefined;
    syncOffsetMs?: number | undefined;
    notes?: string | undefined;
}>;
export declare const rubricScoresSchema: z.ZodObject<{
    acting: z.ZodNumber;
    timing: z.ZodNumber;
    pronunciation: z.ZodNumber;
    expression: z.ZodNumber;
    audio: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    acting: number;
    timing: number;
    pronunciation: number;
    expression: number;
    audio: number;
}, {
    acting: number;
    timing: number;
    pronunciation: number;
    expression: number;
    audio: number;
}>;
export declare const timestampCommentSchema: z.ZodObject<{
    timestampSeconds: z.ZodNumber;
    comment: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestampSeconds: number;
    comment: string;
}, {
    timestampSeconds: number;
    comment: string;
}>;
export declare const createEvaluationSchema: z.ZodObject<{
    submissionId: z.ZodString;
    scores: z.ZodObject<{
        acting: z.ZodNumber;
        timing: z.ZodNumber;
        pronunciation: z.ZodNumber;
        expression: z.ZodNumber;
        audio: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        acting: number;
        timing: number;
        pronunciation: number;
        expression: number;
        audio: number;
    }, {
        acting: number;
        timing: number;
        pronunciation: number;
        expression: number;
        audio: number;
    }>;
    timestampComments: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        timestampSeconds: z.ZodNumber;
        comment: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestampSeconds: number;
        comment: string;
    }, {
        timestampSeconds: number;
        comment: string;
    }>, "many">>>;
    summaryNotes: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    strengths: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    areasForImprovement: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "submitted"]>>;
    attachPointProposal: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    pointProposalDelta: z.ZodOptional<z.ZodNumber>;
    pointProposalCategory: z.ZodOptional<z.ZodString>;
    pointProposalReason: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "submitted" | "draft";
    submissionId: string;
    scores: {
        acting: number;
        timing: number;
        pronunciation: number;
        expression: number;
        audio: number;
    };
    timestampComments: {
        timestampSeconds: number;
        comment: string;
    }[];
    summaryNotes: string;
    strengths: string;
    areasForImprovement: string;
    attachPointProposal: boolean;
    idempotencyKey?: string | undefined;
    pointProposalDelta?: number | undefined;
    pointProposalCategory?: string | undefined;
    pointProposalReason?: string | undefined;
}, {
    submissionId: string;
    scores: {
        acting: number;
        timing: number;
        pronunciation: number;
        expression: number;
        audio: number;
    };
    status?: "submitted" | "draft" | undefined;
    idempotencyKey?: string | undefined;
    timestampComments?: {
        timestampSeconds: number;
        comment: string;
    }[] | undefined;
    summaryNotes?: string | undefined;
    strengths?: string | undefined;
    areasForImprovement?: string | undefined;
    attachPointProposal?: boolean | undefined;
    pointProposalDelta?: number | undefined;
    pointProposalCategory?: string | undefined;
    pointProposalReason?: string | undefined;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreatePointTransactionInput = z.infer<typeof createPointTransactionSchema>;
export type CreatePointProposalInput = z.infer<typeof createPointProposalSchema>;
export type DecidePointProposalInput = z.infer<typeof decidePointProposalSchema>;
export type CreateAppealInput = z.infer<typeof createAppealSchema>;
export type ResolveAppealInput = z.infer<typeof resolveAppealSchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type RubricScoresInput = z.infer<typeof rubricScoresSchema>;
export type TimestampCommentInput = z.infer<typeof timestampCommentSchema>;
export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
//# sourceMappingURL=index.d.ts.map