import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { ChallengeController } from '../controllers/challengeController.js';
import { ALLOWED_MEDIA_MIMES, MAX_MEDIA_FILE_SIZE } from '../services/storage/storageAdapter.js';

const router = Router();

const uploadMaterial = multer({
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

// Public / student challenge discovery
router.get('/challenges', optionalAuth, ChallengeController.listChallenges);
router.get('/challenges/:id', optionalAuth, ChallengeController.getChallengeById);

// Staff / administrative challenge management
router.post(
  '/admin/challenges/upload-media',
  requireAuth,
  requireRole('admin', 'director', 'superadmin'),
  uploadMaterial.single('media'),
  ChallengeController.uploadMaterialMedia
);

router.post(
  '/admin/challenges',
  requireAuth,
  requireRole('admin', 'director', 'superadmin'),
  ChallengeController.createChallenge
);

router.put(
  '/admin/challenges/:id',
  requireAuth,
  requireRole('admin', 'director', 'superadmin'),
  ChallengeController.updateChallenge
);

router.patch(
  '/admin/challenges/:id',
  requireAuth,
  requireRole('admin', 'director', 'superadmin'),
  ChallengeController.updateChallenge
);

router.delete(
  '/admin/challenges/:id',
  requireAuth,
  requireRole('admin', 'superadmin'),
  ChallengeController.deleteChallenge
);

export default router;
