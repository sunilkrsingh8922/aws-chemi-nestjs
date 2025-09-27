import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ChimeModule } from './chime/chime.module';
import { UsersModule } from './users/users.module';
import { UsersController } from './users/users.controller';

import { UsersService } from './users/users.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal:true}),
    ChimeModule,
    UsersModule,
  ],
  controllers: [AppController,UsersController],
  providers: [AppService,UsersService],
})
export class AppModule {}
