import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../global/services/logger.service';

@Injectable()
export class TestCerts {
  private readonly LOG_MESSAGE = 'RequestService';

  constructor(protected loggerService: LoggerService) {}

  async testLoginService2(): Promise<any> {
    const result = await axios.get(
      `${process.env.LOGIN_HOST}/api/v2/logger/listTargetsEnabled`,
    );
    return result.data;
  }
}
