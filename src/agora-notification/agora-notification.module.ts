import { Module } from '@nestjs/common';
import { AgoraNotificationService } from './agora-notification.service';
import { AgoraNotificationController } from './agora-notification.controller';

@Module({
  controllers: [AgoraNotificationController],
  providers: [AgoraNotificationService],
})
export class AgoraNotificationModule {}
