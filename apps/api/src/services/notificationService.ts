import mongoose from 'mongoose';
import { NotificationType, NotificationRecord, NotificationsResponse } from '@pdi/shared';
import { Notification, INotification } from '../models/index.js';

export interface CreateNotificationInput {
  recipientId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string;
  session?: mongoose.ClientSession | null;
}

export interface GetNotificationsOptions {
  limit?: number;
  page?: number;
  unreadOnly?: boolean;
}

export class NotificationService {
  /**
   * Creates an in-app notification for a user.
   */
  static async createNotification(input: CreateNotificationInput): Promise<INotification> {
    const { recipientId, title, message, type, linkUrl, session } = input;

    const notification = new Notification({
      recipientId: new mongoose.Types.ObjectId(recipientId.toString()),
      title,
      message,
      type,
      read: false,
      linkUrl: linkUrl || '',
    });

    return await notification.save({ session: session || undefined });
  }

  /**
   * Fetches user notifications in reverse chronological order, along with unread count.
   */
  static async getUserNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<NotificationsResponse> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = { recipientId: new mongoose.Types.ObjectId(userId) };
    if (options.unreadOnly) {
      query.read = false;
    }

    const [docs, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({
        recipientId: new mongoose.Types.ObjectId(userId),
        read: false,
      }),
    ]);

    const notifications: NotificationRecord[] = docs.map((doc) => ({
      id: doc._id.toString(),
      recipientId: doc.recipientId.toString(),
      title: doc.title,
      message: doc.message,
      type: doc.type,
      read: doc.read,
      linkUrl: doc.linkUrl || undefined,
      createdAt: doc.createdAt.toISOString(),
    }));

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Marks a specific notification as read by its owner.
   */
  static async markAsRead(notificationId: string, userId: string): Promise<NotificationRecord | null> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new Error('INVALID_NOTIFICATION_ID: Invalid notification ID format');
    }

    const doc = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        recipientId: new mongoose.Types.ObjectId(userId),
      },
      { read: true },
      { new: true }
    );

    if (!doc) {
      return null;
    }

    return {
      id: doc._id.toString(),
      recipientId: doc.recipientId.toString(),
      title: doc.title,
      message: doc.message,
      type: doc.type,
      read: doc.read,
      linkUrl: doc.linkUrl || undefined,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  /**
   * Marks all unread notifications as read for a given user.
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      {
        recipientId: new mongoose.Types.ObjectId(userId),
        read: false,
      },
      { read: true }
    );

    return result.modifiedCount;
  }

  /**
   * Gets unread notification count for a user.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await Notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(userId),
      read: false,
    });
  }
}
