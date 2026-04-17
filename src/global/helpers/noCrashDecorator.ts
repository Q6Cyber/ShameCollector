import { Inject } from '@nestjs/common';
import { LoggerService } from '../services/logger.service';

export const noCrash =
  (msg: string, printError = true) =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const injectLogger = Inject(LoggerService);
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      injectLogger(target, 'loggerService');
      try {
        const result = await original.apply(this, args);
        return result;
      } catch (e) {
        const loggerService: LoggerService = this.loggerService;
        if (printError) {
          console.error(msg, JSON.stringify(e));
        }
        loggerService.error(msg, e);
      }
    };
    return descriptor;
  };
