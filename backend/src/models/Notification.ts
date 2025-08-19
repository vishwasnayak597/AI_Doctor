import mongoose, { Document, Schema } from 'mongoose';

const NOTIFICATION_TYPE_VALUES = [
  'appointment_scheduled',
  'appointment_confirmed',
  'appointment_cancelled',
  'appointment_reminder',
  'payment_received',
  'payment_failed',
  'prescription_ready',
  'doctor_verified',
  'account_activated',
  'video_call_starting',
  'system_maintenance',
  'general'
] as const;

const NOTIFICATION_PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'] as const;

export type NotificationType = typeof NOTIFICATION_TYPE_VALUES[number];
export type NotificationPriority = typeof NOTIFICATION_PRIORITY_VALUES[number];

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  readAt?: Date;
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
  channels: Array<'in_app' | 'email' | 'sms' | 'push'>;
  deliveryStatus: {
    in_app?: {
      delivered: boolean;
      deliveredAt?: Date;
    };
    email?: {
      delivered: boolean;
      deliveredAt?: Date;
      error?: string;
    };
    sms?: {
      delivered: boolean;
      deliveredAt?: Date;
      error?: string;
    };
    push?: {
      delivered: boolean;
      deliveredAt?: Date;
      error?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  isExpired: boolean;
  timeSinceCreated: string;
  deliveredChannels: string[];
  // Methods
  markAsRead(): Promise<INotification>;
  markChannelAsDelivered(channel: 'in_app' | 'email' | 'sms' | 'push', error?: string): Promise<INotification>;
}

const notificationSchema = new Schema<INotification>({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  type: {
    type: String,
    enum: {
      values: NOTIFICATION_TYPE_VALUES,
      message: 'Invalid notification type'
    },
    required: [true, 'Notification type is required']
  },
  priority: {
    type: String,
    enum: {
      values: NOTIFICATION_PRIORITY_VALUES,
      message: 'Invalid notification priority'
    },
    default: 'medium'
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [200, 'Title must be less than 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [1000, 'Message must be less than 1000 characters']
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  readAt: {
    type: Date,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String,
    validate: {
      validator: function(url: string) {
        if (!url) return true;
        try {
          new URL(url);
          return true;
        } catch {
          return url.startsWith('/');
        }
      },
      message: 'Invalid action URL'
    }
  },
  actionText: {
    type: String,
    maxlength: [50, 'Action text must be less than 50 characters']
  },
  expiresAt: {
    type: Date,
    default: function() {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      return expiryDate;
    }
  },
  channels: {
    type: [String],
    enum: ['in_app', 'email', 'sms', 'push'],
    default: ['in_app'],
    validate: {
      validator: function(channels: string[]) {
        return channels.length > 0;
      },
      message: 'At least one channel must be selected'
    }
  },
  deliveryStatus: {
    in_app: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date
    },
    email: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      error: String
    },
    sms: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      error: String
    },
    push: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      error: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

notificationSchema.virtual('timeSinceCreated').get(function() {
  const now = new Date();
  const diffInMs = now.getTime() - this.createdAt.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
});

notificationSchema.virtual('deliveredChannels').get(function() {
  const delivered = [];
  if (this.deliveryStatus.in_app?.delivered) delivered.push('in_app');
  if (this.deliveryStatus.email?.delivered) delivered.push('email');
  if (this.deliveryStatus.sms?.delivered) delivered.push('sms');
  if (this.deliveryStatus.push?.delivered) delivered.push('push');
  return delivered;
});

notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markChannelAsDelivered = function(channel: 'in_app' | 'email' | 'sms' | 'push', error?: string) {
  if (!this.deliveryStatus[channel]) {
    this.deliveryStatus[channel] = { delivered: false };
  }
  
  this.deliveryStatus[channel].delivered = !error;
  this.deliveryStatus[channel].deliveredAt = new Date();
  
  if (error) {
    this.deliveryStatus[channel].error = error;
  }
  
  return this.save();
};

export const Notification = mongoose.model<INotification>('Notification', notificationSchema); 