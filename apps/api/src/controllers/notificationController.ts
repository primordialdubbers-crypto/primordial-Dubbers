import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { NotificationService } from '../services/notificationService.js';

export class NotificationController {
  /**
   * GET /api/v1/notifications
   * Fetches the authenticated user's notifications and unread counter.
   */
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id;
      const { page, limit, unreadOnly } = req.query;

      const result = await NotificationService.getUserNotifications(userId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        unreadOnly: unreadOnly === 'true',
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Marks a single notification as read.
   */
  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id;
      const { id } = req.params;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification ID format',
          error: { code: 'INVALID_NOTIFICATION_ID' },
        });
      }

      const updated = await NotificationService.markAsRead(id, userId);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied',
          error: { code: 'NOTIFICATION_NOT_FOUND' },
        });
      }

      res.status(200).json({
        success: true,
        data: { notification: updated },
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/notifications/read-all
   * Marks all unread notifications as read.
   */
  static async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id;

      const modifiedCount = await NotificationService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        data: { modifiedCount },
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }
}
