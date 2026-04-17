import { Module } from '@nestjs/common';
import { CollectionService } from './services/collection.service';
import { GlobalModule } from '../global/global.module';
import { Parsers } from './helpers/parsers';
import { CardCloner } from './helpers/cardCloner';
import { CollectionShopController } from './controller/collection.controller';
import { RequestService } from '../services/request.service';

@Module({
  controllers: [CollectionShopController],
  providers: [CollectionService, Parsers, CardCloner, RequestService],
  imports: [GlobalModule],
  exports: [CollectionService],
})
export class CollectionModule {}
