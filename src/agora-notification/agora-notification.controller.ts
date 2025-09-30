import { Controller, Post, Body, } from '@nestjs/common';
import { AgoraNotificationService } from './agora-notification.service';
import {  SendAgoraNotificationDto } from './dto/create-agora-notification.dto';


@Controller('agora-notification')
export class AgoraNotificationController {
constructor(private readonly agoraNotificationService: AgoraNotificationService) {}

  @Post()
  create(@Body() createAgoraNotificationDto: SendAgoraNotificationDto) {
    return this.agoraNotificationService.sendNotification(createAgoraNotificationDto);
  }
}
