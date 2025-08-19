import { Notification, INotification, NotificationType, NotificationPriority } from '../models/Notification';
import mongoose from 'mongoose';

export interface CreateNotificationRequest {
  recipient: string;
  sender?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
  channels?: Array<'in_app' | 'email' | 'sms' | 'push'>;
}

export interface NotificationFilters {
  recipient?: string;
  type?: NotificationType | NotificationType[];
  priority?: NotificationPriority;
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationRequest): Promise<INotification> {
    const {
      recipient,
      sender,
      type,
      priority = 'medium',
      title,
      message,
      data: notificationData,
      actionUrl,
      actionText,
      expiresAt,
      channels = ['in_app']
    } = data;

    const notification = new Notification({
      recipient: new mongoose.Types.ObjectId(recipient),
      sender: sender ? new mongoose.Types.ObjectId(sender) : undefined,
      type,
      priority,
      title,
      message,
      data: notificationData,
      actionUrl,
      actionText,
      expiresAt,
      channels
    });

    await notification.save();

    // Send notification through specified channels
    await this.deliverNotification(notification);

    return notification;
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(
    userId: string,
    filters: NotificationFilters = {},
    page = 1,
    limit = 20
  ): Promise<{
    notifications: INotification[];
    totalCount: number;
    unreadCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const query: any = {
      recipient: new mongoose.Types.ObjectId(userId)
    };

    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query.type = { $in: filters.type };
      } else {
        query.type = filters.type;
      }
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.isRead !== undefined) {
      query.isRead = filters.isRead;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    const [totalCount, unreadCount] = await Promise.all([
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, isRead: false })
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .populate('sender', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      notifications,
      totalCount,
      unreadCount,
      totalPages,
      currentPage: page
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: new mongoose.Types.ObjectId(userId)
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await notification.markAsRead();
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      {
        recipient: new mongoose.Types.ObjectId(userId),
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: new mongoose.Types.ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      throw new Error('Notification not found');
    }
  }

  /**
   * Delete all notifications for a user
   */
  static async deleteAllNotifications(userId: string): Promise<void> {
    await Notification.deleteMany({
      recipient: new mongoose.Types.ObjectId(userId)
    });
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await Notification.countDocuments({
      recipient: new mongoose.Types.ObjectId(userId),
      isRead: false
    });
  }

  /**
   * Deliver notification through specified channels
   */
  private static async deliverNotification(notification: INotification): Promise<void> {
    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'in_app':
            await this.deliverInAppNotification(notification);
            break;
          case 'email':
            await this.deliverEmailNotification(notification);
            break;
          case 'sms':
            await this.deliverSMSNotification(notification);
            break;
          case 'push':
            await this.deliverPushNotification(notification);
            break;
        }
      } catch (error) {
        console.error(`Failed to deliver ${channel} notification:`, error);
        await notification.markChannelAsDelivered(channel, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Deliver in-app notification
   */
  private static async deliverInAppNotification(notification: INotification): Promise<void> {
    // In-app notifications are delivered by creating the record in the database
    // Real-time delivery would be handled by WebSocket/SSE in a production app
    await notification.markChannelAsDelivered('in_app');
    
    // TODO: In production, you would emit this through WebSocket/SSE
    // Example: websocketService.emit(notification.recipient, 'new_notification', notification);
  }

  /**
   * Deliver email notification
   */
  private static async deliverEmailNotification(notification: INotification): Promise<void> {
    // Mock email delivery for development
    // In production, integrate with services like SendGrid, SES, etc.
    
    console.log(`📧 Email Notification Sent:`);
    console.log(`To: ${notification.recipient}`);
    console.log(`Subject: ${notification.title}`);
    console.log(`Message: ${notification.message}`);
    
    await notification.markChannelAsDelivered('email');
    
    // TODO: Implement actual email delivery
    // Example: await emailService.send({
    //   to: user.email,
    //   subject: notification.title,
    //   template: 'notification',
    //   data: { notification }
    // });
  }

  /**
   * Deliver SMS notification
   */
  private static async deliverSMSNotification(notification: INotification): Promise<void> {
    // Mock SMS delivery for development
    // In production, integrate with services like Twilio, AWS SNS, etc.
    
    console.log(`📱 SMS Notification Sent:`);
    console.log(`To: ${notification.recipient}`);
    console.log(`Message: ${notification.title} - ${notification.message}`);
    
    await notification.markChannelAsDelivered('sms');
    
    // TODO: Implement actual SMS delivery
    // Example: await smsService.send({
    //   to: user.phoneNumber,
    //   message: `${notification.title}\n${notification.message}`
    // });
  }

  /**
   * Deliver push notification
   */
  private static async deliverPushNotification(notification: INotification): Promise<void> {
    // Mock push notification delivery for development
    // In production, integrate with FCM, APNS, etc.
    
    console.log(`🔔 Push Notification Sent:`);
    console.log(`To: ${notification.recipient}`);
    console.log(`Title: ${notification.title}`);
    console.log(`Body: ${notification.message}`);
    
    await notification.markChannelAsDelivered('push');
    
    // TODO: Implement actual push notification delivery
    // Example: await pushService.send({
    //   to: user.deviceTokens,
    //   title: notification.title,
    //   body: notification.message,
    //   data: notification.data
    // });
  }

  /**
   * Create bulk notifications for multiple recipients
   */
  static async createBulkNotifications(
    recipients: string[],
    notificationData: Omit<CreateNotificationRequest, 'recipient'>
  ): Promise<INotification[]> {
    const notifications = await Promise.all(
      recipients.map(recipient =>
        this.createNotification({ ...notificationData, recipient })
      )
    );

    return notifications;
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  }> {
    const [total, unread, byTypeResults, byPriorityResults] = await Promise.all([
      Notification.countDocuments({ recipient: new mongoose.Types.ObjectId(userId) }),
      Notification.countDocuments({ recipient: new mongoose.Types.ObjectId(userId), isRead: false }),
      Notification.aggregate([
        { $match: { recipient: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Notification.aggregate([
        { $match: { recipient: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);

    const byType = {} as Record<NotificationType, number>;
    const byPriority = {} as Record<NotificationPriority, number>;

    byTypeResults.forEach(result => {
      byType[result._id as NotificationType] = result.count;
    });

    byPriorityResults.forEach(result => {
      byPriority[result._id as NotificationPriority] = result.count;
    });

    return { total, unread, byType, byPriority };
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<number> {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    return result.deletedCount;
  }

  /**
   * Send system-wide maintenance notification
   */
  static async sendMaintenanceNotification(
    message: string,
    scheduledDate: Date,
    excludeRoles: string[] = []
  ): Promise<void> {
    // This would typically get all active users and send them a notification
    // For now, it's a placeholder that shows the structure
    
    console.log(`🔧 System Maintenance Notification:`);
    console.log(`Message: ${message}`);
    console.log(`Scheduled: ${scheduledDate}`);
    console.log(`Excluded roles: ${excludeRoles.join(', ')}`);
    
    // TODO: Implement bulk notification to all users
    // const users = await User.find({ role: { $nin: excludeRoles }, isActive: true });
    // const recipients = users.map(user => user._id.toString());
    // 
    // await this.createBulkNotifications(recipients, {
    //   type: 'system_maintenance',
    //   priority: 'high',
    //   title: 'Scheduled Maintenance',
    //   message,
    //   data: { scheduledDate },
    //   channels: ['in_app', 'email']
    // });
  }
} 