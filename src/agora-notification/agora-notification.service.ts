import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { SendAgoraNotificationDto } from './dto/create-agora-notification.dto';

@Injectable()
export class AgoraNotificationService {
  constructor(private readonly configService: ConfigService) {
    const firebaseProjectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const firebaseClientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const firebasePrivateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!admin.apps.length) {
      try {
        if (gacPath) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        } else if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: firebaseProjectId,
              clientEmail: firebaseClientEmail,
              privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
            }),
          });
        }

        if (admin.apps.length) {
          console.log(
            'Firebase initialized for project:',
            (admin.app().options as any)?.projectId ?? 'unknown',
          );
        }
      } catch (err) {
        console.error('Failed to initialize Firebase Admin SDK:', err);
      }
    }
  }



  // New method to send a notification
  async sendNotification(
    payload: SendAgoraNotificationDto
  ) {
    const { token, title, body, data } = payload
    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      data,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }
}
