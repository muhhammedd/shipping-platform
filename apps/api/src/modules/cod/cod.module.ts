import { Module } from '@nestjs/common';
import { CodService } from './cod.service';
import { CodController } from './cod.controller';

@Module({
  providers: [CodService],
  controllers: [CodController],
  exports: [CodService],
})
export class CodModule {}
