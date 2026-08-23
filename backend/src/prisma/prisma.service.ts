import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Establish connection to database when the module initializes
    await this.$connect();
  }

  async onModuleDestroy() {
    // Cleanly close connection when module is destroyed
    await this.$disconnect();
  }
}
