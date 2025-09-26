// src/chime/chime.service.ts
import { ChimeSDKMeetingsClient, CreateAttendeeCommand, CreateMeetingCommand } from '@aws-sdk/client-chime-sdk-meetings';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class ChimeService {
  private meetings: Record<string, any> = {};
  chime: ChimeSDKMeetingsClient;
  constructor(private readonly configService: ConfigService
  ) {
    AWS.config.update({
      region: this.configService.get<string>('AWS_REGION'), credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY') ?? "",
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_KEY') ?? "",
      }
    });
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
          // eslint-disable-next-line no-console
          console.log('Firebase initialized for project:', (admin.app().options as any)?.projectId ?? 'unknown');
        }
      } catch (err) {
        // Defer throwing to send time to avoid crashing app on boot.
        // eslint-disable-next-line no-console
        console.error('Failed to initialize Firebase Admin SDK:', err);
      }
    }
    this.chime = new ChimeSDKMeetingsClient({
      region: 'us-east-1', credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY') ?? "",
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_KEY') ?? "",
      }, endpoint: "https://meetings-chime.us-east-1.amazonaws.com"
    });
  }

  async createMeeting() {
    const input = { // CreateMeetingRequest
      ClientRequestToken: "apple" as string, // required
      MediaRegion: 'us-east-1',
      ExternalMeetingId: "Public", // required

      MeetingFeatures: { // MeetingFeaturesConfiguration
        Audio: { // AudioFeatures
          EchoReduction: "AVAILABLE",
        },
        Video: { // VideoFeatures
          MaxResolution: "HD",
        },
        Attendee: { // AttendeeFeatures
          MaxCount: 3,
        },
      },
    };
    const command = new CreateMeetingCommand(input as any);
    const response = await this.chime.send(command);
    return response;
  }

  async createAtendee(meetingId: string, name: string) {
    console.log({ meetingId })
    const attendeeResponse = await this.chime.send(
      new CreateAttendeeCommand({
        MeetingId: meetingId,
        ExternalUserId: name ?? "Amil",
      })
    );
    return attendeeResponse
  }

  async call(user: any) {
    // const meeting = await this.createMeeting()
    // const meetingId = meeting.Meeting?.MeetingId!
    var meeting;
    var meetingId ;
    if(user.meeting.Meeting?.MeetingId ==null) {
     meeting = await this.createMeeting()
    } else {
      meeting = user.meeting.Meeting;
    }

    meetingId = meeting.Meeting?.MeetingId!
    const atendee = await this.createAtendee(meetingId, user.name)
    await this.sendPushNotification(meetingId, user.fcmToken, user.name)
    return {
      meeting, atendee
    }
  }

  async fcmStatus(deviceToken?: string) {
    const initialized = admin.apps.length > 0;
    const projectId = initialized ? ((admin.app().options as any)?.projectId ?? 'unknown') : undefined;
    if (deviceToken && initialized) {
      try {
        const dryRunMsg: admin.messaging.Message = {
          token: deviceToken,
          data: { ping: 'true' },
        };
        await admin.messaging().send(dryRunMsg, true);
        return { initialized, projectId, tokenValid: true };
      } catch (err: any) {
        return { initialized, projectId, tokenValid: false, error: err?.message ?? String(err) };
      }
    }
    return { initialized, projectId };
  }

  async sendPushNotification(meetingId: string, deviceToken: string, name?: string) {
    if (!deviceToken) {
      throw new BadRequestException('Missing device token for FCM');
    }
    if (!admin.apps.length) {
      throw new BadRequestException('Firebase Admin not initialized. Provide GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* env vars.');
    }

    const callerName = name ?? 'Unknown';
    const title = 'Incoming Chime Call';
    const body = `${callerName} invited you. Join meeting ${meetingId}`;

    const message: admin.messaging.Message = {
      token: deviceToken,
      notification: {
        title,
        body,
      },
      data: {
        meetingId,
        name: callerName,
        type: 'CALL_INVITE',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'calls',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        } as any,
      },
    };

    try {
      const response = await admin.messaging().send(message);
      return { messageId: response };
    } catch (err: any) {
      // Surface clear error to client instead of generic 500
      throw new BadRequestException(`FCM send failed: ${err?.message ?? 'unknown error'}`);
    }
  }

  async acceptCall(meetingId, name) {
    return this.createAtendee(meetingId, name)
  }
}
