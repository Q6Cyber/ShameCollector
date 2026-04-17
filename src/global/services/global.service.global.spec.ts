import { Test, TestingModule } from '@nestjs/testing';
import { GlobalService } from './global.service';
import { LoggerService } from './logger.service';
import { ScheduleModule } from '@nestjs/schedule';
import { GrayLogHandler } from './graylog.service';

let service: GlobalService;
beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [ScheduleModule.forRoot()],
    providers: [GlobalService, LoggerService, GrayLogHandler],
  }).compile();

  service = module.get<GlobalService>(GlobalService);
});

describe('GlobalService Active / Inactive', () => {
  it('It should disable the global service', () => {
    service.service.disable();
    expect(service.service.isActive()).toEqual(false);
  });

  it('It should enable the global service', () => {
    service.service.enable();
    expect(service.service.isActive()).toEqual(true);
  });
});

describe('GlobalService Shop Enable/Disable', () => {
  it('It should return a list of white listed shops', () => {
    const result = service.shops.list;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
  it('It should disable a shop', () => {
    const result = service.shops.disable('Sakura_Test_SC_Feeder_20');
    expect(result.status).toEqual(true);
  });

  it('It should not disable a disabled shop', () => {
    const result = service.shops.disable('Sakura_Test_SC_Feeder_20');

    expect(result.status).toEqual(false);
  });

  it('It should enable a shop', () => {
    const result = service.shops.enable('Sakura_Test_SC_Feeder_20');
    expect(result.status).toEqual(true);
  });

  it('It should not enable an enabled shop', () => {
    const result = service.shops.enable('Sakura_Test_SC_Feeder_20');
    expect(result.status).toEqual(false);
  });

  it('It should not disable a non whitelisted shop', () => {
    const result = service.shops.disable('Dummy shop');
    expect(result.status).toEqual(false);
  });
  // Two in one test!
  it('It should enable all stores and provide status', () => {
    service.shops.disable('Sakura_Test_SC_Feeder_20');
    service.shops.disable('Sakura_Test_SC_Feeder_21');
    service.shops.enableAll();
    expect(service.shops.status('Sakura_Test_SC_Feeder_20')).toBeTruthy();
    expect(service.shops.status('Sakura_Test_SC_Feeder_21')).toBeTruthy();
    expect(service.shops.status('Dummy Shop')).toBeFalsy();
  });

  it('It should read true for an enabled user (non-blacklisted / fused)', () => {
    const result = service.shops.validateUser(
      'Sakura_Test_SC_Feeder_20',
      'testUser',
    );
    expect(result).toEqual(true);
  });

  it('It should disable a user / fuse it', () => {
    const result = service.shops.disableUser(
      'Sakura_Test_SC_Feeder_20',
      'testUser',
      'regular',
    );
    expect(result.status).toEqual(true);
  });

  it('It should not disable a disabled user', () => {
    const result = service.shops.disableUser(
      'Sakura_Test_SC_Feeder_20',
      'testUser',
      'regular',
    );
    expect(result.status).toEqual(false);
  });

  it('It should enable a user / de-fuse it', () => {
    const result = service.shops.enableUser(
      'Sakura_Test_SC_Feeder_20',
      'testUser',
    );
    expect(result.status).toEqual(true);
  });

  it('It should not enable an enabled user', () => {
    const result = service.shops.enableUser(
      'Sakura_Test_SC_Feeder_20',
      'testUser',
    );
    expect(result.status).toEqual(false);
  });

  // Count browsers
  it('It should have capacity', () => {
    const result = service.shops.capacity(
      'Sakura_Test_SC_Feeder_20',
      'testUser',
      'REGULAR',
      'TestBrowser',
    );
    expect(result).toEqual(true);
  });

  it('It should not have capacity', () => {
    const result = service.shops.capacity(
      'Sakura_Test_SC_Feeder_20',
      'testUser',
      'REGULAR',
      'TestBrowser',
    );
    expect(result).toEqual(false);
  });
  it('It should release capacity', () => {
    const result = service.shops.release(
      'Sakura_Test_SC_Feeder_20',
      'testUser',
      'TestBrowser',
    );
    expect(result).toEqual(true);
  });
  it('It should have capacity again', () => {
    const result = service.shops.capacity(
      'Sakura_Test_SC_Feeder_20',
      'testUser',
      'REGULAR',
      'TestBrowser',
    );
    expect(result).toEqual(true);
  });
});
