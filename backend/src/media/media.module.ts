import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaController } from '../controllers/media.controller';
import { MediaService } from '../services/media.service';

@Module({
  imports: [
    // Файлыг буферт хадгалах (минIO руу шилжүүлэхийн өмнө диск хэрэглэхгүй)
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB хамгийн дээд хэмжээ
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
