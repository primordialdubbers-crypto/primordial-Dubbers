import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UploadedFilePayload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StorageUploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface StorageAdapter {
  uploadFile(file: UploadedFilePayload, folder?: string): Promise<StorageUploadResult>;
  getPresignedUploadUrl?(key: string, mimeType: string): Promise<{ uploadUrl: string; fileUrl: string }>;
  deleteFile?(key: string): Promise<void>;
}

export const ALLOWED_AUDIO_MIMES = [
  'audio/wav',
  'audio/mpeg',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/x-wav',
  'audio/mp3',
  'audio/aac',
];

export const MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024; // 50MB per PRD

export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;
  private publicPrefix: string;

  constructor(baseDir?: string, publicPrefix?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'uploads');
    this.publicPrefix = publicPrefix || '/uploads';

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile(file: UploadedFilePayload, folder = 'audio'): Promise<StorageUploadResult> {
    const mimeNormalized = file.mimetype.toLowerCase();

    if (!ALLOWED_AUDIO_MIMES.includes(mimeNormalized)) {
      throw new Error(
        `INVALID_AUDIO_FORMAT: MIME type '${file.mimetype}' is not permitted. Strictly audio only: wav, mpeg/mp3, webm, ogg, mp4/aac.`
      );
    }

    if (file.size > MAX_AUDIO_FILE_SIZE) {
      throw new Error(
        `FILE_TOO_LARGE: Audio file size (${Math.round(file.size / (1024 * 1024))}MB) exceeds maximum allowed limit of 50MB.`
      );
    }

    const targetFolder = path.join(this.baseDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const ext = path.extname(file.originalname) || (mimeNormalized.includes('wav') ? '.wav' : '.mp3');
    const randomHash = crypto.randomBytes(8).toString('hex');
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${Date.now()}_${safeBase}_${randomHash}${ext}`;
    const destinationPath = path.join(targetFolder, filename);

    await fs.promises.writeFile(destinationPath, file.buffer);

    const relativeKey = `${folder}/${filename}`.replace(/\\/g, '/');
    const url = `${this.publicPrefix}/${relativeKey}`;

    return {
      url,
      key: relativeKey,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async getPresignedUploadUrl(key: string, mimeType: string): Promise<{ uploadUrl: string; fileUrl: string }> {
    const fileUrl = `${this.publicPrefix}/${key}`;
    const uploadUrl = `/api/v1/media/upload?key=${encodeURIComponent(key)}&mime=${encodeURIComponent(mimeType)}`;
    return { uploadUrl, fileUrl };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

// Default storage adapter instance
export const storageService: StorageAdapter = new LocalStorageAdapter();
