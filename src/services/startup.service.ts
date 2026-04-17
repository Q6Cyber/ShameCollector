import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { RedisService } from '../global/services/redis.service';

@Injectable()
export class StartupService implements OnApplicationBootstrap {
  constructor(private readonly redisService: RedisService) {}

  async onApplicationBootstrap() {}
}
