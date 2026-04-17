import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LoggerService } from '../global/services/logger.service';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  constructor(protected loggerService: LoggerService) {}

  catch(exception: Error | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const error = {
      status,
      error: exception?.message || 'Internal server error',
    };

    this.loggerService.error('GlobalExceptionFilter::Error', error);

    response.status(status).json(error);
  }
}
