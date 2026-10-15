import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { SubmissionController } from '../controllers/submissionController.js';
import { ALLOWED_MEDIA_MIMES, MAX_MEDIA_FILE_SIZE } from '../services/storage/storageAdapter.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MEDIA_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    if (ALLOWED_MEDIA_MIMES.includes(mime)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `INVALID_MEDIA_FORMAT: MIME type '${file.mimetype}' is not allowed. Supported formats: MP4, WebM, QuickTime, WAV, MP3, OGG, AAC`
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
