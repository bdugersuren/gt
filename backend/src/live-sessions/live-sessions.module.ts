import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveSessionsGateway } from './live-sessions.gateway';
import { LiveSessionsService } from './live-sessions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'super_secret_jwt_sign_key_change_me_in_production',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LiveSessionsController],
  providers: [LiveSessionsGateway, LiveSessionsService],
  exports: [LiveSessionsService],
})
export class LiveSessionsModule {}
