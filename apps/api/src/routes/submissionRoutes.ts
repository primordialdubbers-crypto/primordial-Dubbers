import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { SubmissionController } from '../controllers/submissionController.js';
import { ALLOWED_AUDIO_MIMES, MAX_AUDIO_FILE_SIZE } from '../services/storage/storageAdapter.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_AUDIO_MIMES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `INVALID_AUDIO_FORMAT: MIME type '${file.mimetype}' is not allowed. Supported formats: WAV, MP3, WebM, OGG, MP4/AAC`
        )
      );
    }
  },
});

// Standalone media upload
router.post(
  '/media/upload',
  requireAuth,
  upload.single('audio'),
  SubmissionController.uploadAudio
);

// Audition submission
router.post(
  '/submissions',
  requireAuth,
  upload.single('audio'),
  SubmissionController.submitAudition
);

// Student view own audition takes
router.get('/submissions/my', requireAuth, SubmissionController.getMySubmissions);

// Staff / Director view audition submissions for a challenge
router.get(
  '/challenges/:id/submissions',
  requireAuth,
  requireRole('director', 'admin', 'superadmin'),
  SubmissionController.getChallengeSubmissions
);

export default router;
