import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { ClassGroupsModule } from './class-groups/class-groups.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { BullModule } from '@nestjs/bullmq';
import { VideosModule } from './videos/videos.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { InternshipLogsModule } from './internship-logs/internship-logs.module';
import { EsisModule } from './esis/esis.module';
import { CareerModule } from './career/career.module';
import { MessagesModule } from './messages/messages.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AdminModule } from './admin/admin.module';
import { MediaModule } from './media/media.module';
import { LiveSessionsModule } from './live-sessions/live-sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make env variables accessible across all modules
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    ClassGroupsModule,
    CoursesModule,
    LessonsModule,
    BullModule.forRoot({
      connection: {
        host: 'redis',
        port: 6379,
      },
    }),
    VideosModule,
    QuizzesModule,
    EvaluationsModule,
    InternshipLogsModule,
    EsisModule,
    CareerModule,
    MessagesModule,
    AnnouncementsModule,
    AdminModule,
    MediaModule,
    LiveSessionsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
