// src/chime/chime.service.ts
import { ChimeSDKMeetingsClient, CreateAttendeeCommand, CreateMeetingCommand, CreateMeetingCommandOutput, CreateMeetingWithAttendeesCommand, GetMeetingCommand, ListAttendeesCommand } from '@aws-sdk/client-chime-sdk-meetings';
import { Injectable, BadRequestException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';
import { AcceptMeeting, CreateCallMeeting, INotification } from './dto/createCall.dto';
import { SavedUser } from 'src/users/users.service';
import { v4 as uuidv4 } from 'uuid';


const meetings: Record<string, CreateMeetingCommandOutput['Meeting']> = {}

@Injectable()
export class ChimeService {
  // private meetings: Record<string, any> = {};
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

  async createMeetingWithAttendee() {
    const command = new CreateMeetingWithAttendeesCommand({ 
      ClientRequestToken: uuidv4()+"Token", // required
      MediaRegion: 'us-east-1', // required
      ExternalMeetingId: uuidv4(), // required
      MeetingFeatures: { // MeetingFeaturesConfiguration
        Audio: { // AudioFeatures
          EchoReduction: "AVAILABLE",
        },
        Video: { // VideoFeatures
          MaxResolution: "HD"
        },
        Content: { // ContentFeatures
          MaxResolution: "FHD",
        },
        Attendee: { // AttendeeFeatures
          MaxCount: 5,
        },

      },

      Attendees: [ // CreateMeetingWithAttendeesRequestItemList // required
        { 
          ExternalUserId: Math.random().toString(),

          Capabilities: { // AttendeeCapabilities
            Audio: "SendReceive",
            Video: "SendReceive",
            Content: "SendReceive"
          },
        },
        { 
          ExternalUserId:Math.random().toString(),
          Capabilities: { 
            Audio: "SendReceive",
            Video: "SendReceive",
            Content: "SendReceive"
          },
        },
      ],
    });
    console.log(command)
    return await this.chime.send(command);
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

  async sendPushNotification(notification: INotification) {
    const { name, fcmToken, meetingId } = notification
    // if (!deviceToken) {
    //   throw new BadRequestException('Missing device token for FCM');
    // }
    // if (!admin.apps.length) {
    //   throw new BadRequestException('Firebase Admin not initialized. Provide GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* env vars.');
    // }

    const callerName = name ?? 'Unknown';
    const title = 'Incoming Chime Call';
    const body = `${callerName} invited you. Join meeting ${meetingId}`;

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        // meetingId,
        // name: callerName,
        type: 'CALL_INVITE',
        ...notification
        
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
      throw new BadRequestException(`FCM send failed: ${err?.message ?? 'unknown error'}`);
    }
  }
  async call(createCallMeeting: CreateCallMeeting) {
    const { callerId, attendeeId } = createCallMeeting;
    const Meeting = await this.createMeetingWithAttendee();
    if (!Meeting?.Meeting?.MeetingId) throw new BadRequestException({ message: "Server error exceptions" });
    const meetingId = Meeting?.Meeting?.MeetingId;
    if(!Meeting.Attendees) throw new HttpException("Attendee not available",HttpStatus.BAD_REQUEST)

    await this.sendPushNotification({
      name: SavedUser[1].username,
      fcmToken: SavedUser[1].fcmToken,
      meetingId,
      receiver:Meeting.Attendees[1].AttendeeId!
    });
    return {Meeting:Meeting.Meeting,Caller:Meeting.Attendees[0],Receiver:Meeting.Attendees[1]}
  }

  async getAttendeeList(MeetingId: string) {
    const command = new ListAttendeesCommand({ MeetingId });
    const { Attendees } = await this.chime.send(command)
    const cmd = new GetMeetingCommand({ MeetingId });
    const { Meeting } = await this.chime.send(cmd)
    return {
      Attendees,
      Meeting
    }
  }
}
