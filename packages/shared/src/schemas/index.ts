import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must not exceed 50 characters'),
  // Public registration defaults to student. Director/admin requires admin invite token.
  requestedRole: z.enum(['student', 'director', 'admin']).optional().default('student'),
  adminInviteToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  forceLogoutOthers: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  voiceTypes: z.array(z.string()).max(10).optional(),
  languages: z.array(z.string()).max(10).optional(),
  publicOptIn: z.boolean().optional(),
});

export const createPointTransactionSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  delta: z
    .number({ required_error: 'Delta points value is required' })
    .int('Delta must be an integer')
    .refine((val) => val !== 0, 'Delta cannot be zero'),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(500),
  category: z.string().trim().min(2, 'Category is required').max(100),
  sourceId: z.string().optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(6, 'Idempotency key must be at least 6 characters'),
});

export const createPointProposalSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  delta: z
    .number({ required_error: 'Delta points value is required' })
    .int('Delta must be an integer')
    .refine((val) => val !== 0, 'Delta cannot be zero'),
  category: z.string().trim().min(2, 'Category is required').max(100),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(500),
  sourceType: z
    .enum(['review', 'manual_award', 'manual_deduction', 'challenge', 'appeal_reversal'])
    .default('manual_award'),
  sourceId: z.string().optional(),
  evidenceIds: z.array(z.string()).optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(6, 'Idempotency key must be at least 6 characters'),
});

export const decidePointProposalSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  decisionNote: z.string().trim().max(500).optional(),
});

export const createAppealSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  reason: z.string().trim().min(10, 'Appeal justification must be at least 10 characters').max(1000),
  evidenceText: z.string().trim().max(1000).optional(),
});

export const resolveAppealSchema = z.object({
  decision: z.enum(['grant', 'reject', 'granted', 'rejected']),
  decisionNote: z.string().trim().max(500).optional(),
});

export const createChallengeSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().min(5, 'Description is required').max(2000),
  characterName: z.string().trim().min(1, 'Character name is required').max(100),
  script: z.string().trim().min(5, 'Script is required').max(5000),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Master']).default('Beginner'),
  targetRank: z.enum(['ED', 'C', 'B', 'A', 'S']).default('ED'),
  referenceMediaUrl: z.string().optional().or(z.literal('')),
  deadline: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
  assignedStudentIds: z.array(z.string()).optional().default([]),
  isPersonal: z.boolean().optional().default(false),
});

export const updateChallengeSchema = createChallengeSchema.partial();

export const createSubmissionSchema = z.object({
  challengeId: z.string().optional().nullable(),
  customTitle: z.string().trim().max(150).optional(),
  characterName: z.string().trim().max(100).optional(),
  audioUrl: z.string().min(1, 'Audio URL is required'),
  videoUrl: z.string().optional(),
  durationSeconds: z.number().positive('Duration must be greater than 0').max(600, 'Audio exceeds maximum 10-minute duration limit'),
  mimeType: z.string().refine((val) => {
    const allowed = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-wav', 'audio/mp3', 'audio/aac'];
    return allowed.includes(val.toLowerCase());
  }, 'MIME type must be an audio format: audio/wav, audio/mpeg, audio/webm, audio/ogg, audio/mp4'),
  submissionType: z.enum(['recorded', 'uploaded']).default('uploaded'),
  syncOffsetMs: z.number().min(-500, 'Latency offset must be at least -500ms').max(500, 'Latency offset cannot exceed +500ms').optional().default(0),
  notes: z.string().trim().max(500).optional(),
});

export const rubricScoresSchema = z.object({
  acting: z.number().min(0, 'Acting score cannot be negative').max(25, 'Acting score maximum is 25'),
  timing: z.number().min(0, 'Lip sync / timing score cannot be negative').max(20, 'Lip sync / timing score maximum is 20'),
  pronunciation: z.number().min(0, 'Pronunciation score cannot be negative').max(20, 'Pronunciation score maximum is 20'),
  expression: z.number().min(0, 'Character expression score cannot be negative').max(20, 'Character expression score maximum is 20'),
  audio: z.number().min(0, 'Audio quality score cannot be negative').max(15, 'Audio quality score maximum is 15'),
});

export const timestampCommentSchema = z.object({
  timestampSeconds: z.number().min(0, 'Timestamp cannot be negative'),
  comment: z.string().trim().min(1, 'Comment text cannot be empty').max(500, 'Comment cannot exceed 500 characters'),
});

export const createEvaluationSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  scores: rubricScoresSchema,
  timestampComments: z.array(timestampCommentSchema).optional().default([]),
  summaryNotes: z.string().trim().max(1000).optional().default(''),
  strengths: z.string().trim().max(1000).optional().default(''),
  areasForImprovement: z.string().trim().max(1000).optional().default(''),
  status: z.enum(['draft', 'submitted']).default('submitted'),
  attachPointProposal: z.boolean().optional().default(false),
  pointProposalDelta: z.number().int().optional(),
  pointProposalCategory: z.string().trim().optional(),
  pointProposalReason: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().optional(),
});

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


