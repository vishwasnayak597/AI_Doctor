import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { NotificationService, CreateNotificationRequest } from '../services/NotificationService';
import { authenticate } from '../middleware/auth';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const router = Router();

router.post('/', [
  authenticate,
  body('recipient').notEmpty().isMongoId(),
  body('type').isIn(['appointment_scheduled', 'appointment_confirmed', 'appointment_cancelled', 'appointment_reminder', 'payment_received', 'payment_failed', 'prescription_ready', 'doctor_verified', 'account_activated', 'video_call_starting', 'system_maintenance', 'general']),
  body('title').notEmpty().isLength({ min: 1, max: 200 }),
  body('message').notEmpty().isLength({ min: 1, max: 1000 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('channels').optional().isArray()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array().map(err => err.msg).join(', ') });
    }

    if (req.user!.role !== 'admin' && req.user!._id.toString() !== req.body.recipient) {
      return res.status(403).json({ success: false, error: 'Unauthorized to create notifications for other users' });
    }

    const notificationData: CreateNotificationRequest = {
      recipient: req.body.recipient,
      sender: req.user!._id.toString(),
      type: req.body.type,
      priority: req.body.priority,
      title: req.body.title,
      message: req.body.message,
      data: req.body.data,
      actionUrl: req.body.actionUrl,
      actionText: req.body.actionText,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      channels: req.body.channels
    };

    const notification = await NotificationService.createNotification(notificationData);
    res.status(201).json({ success: true, data: notification, message: 'Notification created successfully' });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create notification' });
  }
});

router.get('/', [authenticate], async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.user!._id.toString();

    const filters: any = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.isRead !== undefined) filters.isRead = req.query.isRead === 'true';
    if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

    const result = await NotificationService.getNotifications(userId, filters, page, limit);
    res.json({ success: true, data: result, message: 'Notifications retrieved successfully' });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch notifications' });
  }
});

router.get('/unread-count', [authenticate], async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const count = await NotificationService.getUnreadCount(userId);
    res.json({ success: true, data: { count }, message: 'Unread count retrieved successfully' });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch unread count' });
  }
});

router.get('/stats', [authenticate], async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const stats = await NotificationService.getNotificationStats(userId);
    res.json({ success: true, data: stats, message: 'Notification statistics retrieved successfully' });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch notification statistics' });
  }
});

router.patch('/:id/read', [authenticate, param('id').isMongoId()], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array().map(err => err.msg).join(', ') });
    }

    const notification = await NotificationService.markAsRead(req.params.id, req.user!._id.toString());
    res.json({ success: true, data: notification, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to mark notification as read' });
  }
});

router.patch('/mark-all-read', [authenticate], async (req: Request, res: Response) => {
  try {
    await NotificationService.markAllAsRead(req.user!._id.toString());
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to mark all notifications as read' });
  }
});

router.delete('/:id', [authenticate, param('id').isMongoId()], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array().map(err => err.msg).join(', ') });
    }

    await NotificationService.deleteNotification(req.params.id, req.user!._id.toString());
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to delete notification' });
  }
});

router.delete('/', [authenticate], async (req: Request, res: Response) => {
  try {
    await NotificationService.deleteAllNotifications(req.user!._id.toString());
    res.json({ success: true, message: 'All notifications deleted successfully' });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to delete all notifications' });
  }
});

export default router; 