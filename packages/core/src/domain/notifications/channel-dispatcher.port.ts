import { NotificationMessage, NotificationChannel } from './notification.entity.js';

export interface DispatchResult {
  readonly success: boolean;
  readonly messageId: string;
  readonly channel: NotificationChannel;
  readonly externalId?: string;
  readonly errorDetails?: string;
}

export interface ChannelDispatcher {
  readonly channel: NotificationChannel;
  dispatch(message: NotificationMessage, subject: string, body: string): Promise<DispatchResult>;
}

export class WhatsAppChannelDispatcher implements ChannelDispatcher {
  public readonly channel: NotificationChannel = 'whatsapp';

  async dispatch(message: NotificationMessage, subject: string, body: string): Promise<DispatchResult> {
    // WhatsApp Cloud API direct dispatch simulation
    if (message.recipientTarget.includes('invalid')) {
      return {
        success: false,
        messageId: message.id,
        channel: this.channel,
        errorDetails: 'Invalid phone number target for WhatsApp Cloud API',
      };
    }

    return {
      success: true,
      messageId: message.id,
      channel: this.channel,
      externalId: `wa-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
  }
}

export class EmailChannelDispatcher implements ChannelDispatcher {
  public readonly channel: NotificationChannel = 'email';

  async dispatch(message: NotificationMessage, subject: string, body: string): Promise<DispatchResult> {
    if (!message.recipientTarget.includes('@')) {
      return {
        success: false,
        messageId: message.id,
        channel: this.channel,
        errorDetails: 'Malformed recipient email address',
      };
    }

    return {
      success: true,
      messageId: message.id,
      channel: this.channel,
      externalId: `email-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
  }
}

export class WebPushChannelDispatcher implements ChannelDispatcher {
  public readonly channel: NotificationChannel = 'webpush';

  async dispatch(message: NotificationMessage, subject: string, body: string): Promise<DispatchResult> {
    if (message.recipientTarget.includes('expired_token')) {
      return {
        success: false,
        messageId: message.id,
        channel: this.channel,
        errorDetails: 'Push subscription endpoint expired',
      };
    }

    return {
      success: true,
      messageId: message.id,
      channel: this.channel,
      externalId: `push-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
  }
}
