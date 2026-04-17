/* eslint-disable camelcase */
/* eslint @typescript-eslint/no-var-requires: "off" */
import { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';
import moment from 'moment';

@Injectable()
export class RedisService {
  private readonly LOG_MESSAGE = `RedisService::`;
  private readonly sessionsRedis;
  private readonly sourcesRedis;
  private readonly duplicateRedis;

  constructor(protected loggerService: LoggerService) {
    this.sessionsRedis = new Redis({
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      db: Number(process.env.REDIS_DB_SESSIONS),
    });
    this.sourcesRedis = new Redis({
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      db: Number(process.env.REDIS_DB_SOURCES),
    });
    this.duplicateRedis = new Redis({
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      db: Number(process.env.REDIS_DB_DUPLICATE),
    });
  }

  async getRedisIndex(index: string) {
    const loggerHeader = `${this.LOG_MESSAGE}getRedisIndex`;
    let response = null;
    try {
      switch (index) {
        case 'session':
          response = this.sessionsRedis;
          break;
        case 'source':
          response = this.sourcesRedis;
          break;
        case 'duplicate':
          response = this.duplicateRedis;
          break;
        default:
          response = null;
          break;
      }
      await Promise.resolve();
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error getting redis index obj: ${index}`,
        error,
      );
    }
    return response;
  }

  async deleteRedisKey(index: string, key: string) {
    const loggerHeader = `${this.LOG_MESSAGE}deleteRedisKey`;
    let response = null;
    try {
      const redisIndex: any = await this.getRedisIndex(index);
      response = await redisIndex.del(key);
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error deleting redis key: ${key}`,
        error,
      );
    }
    return response;
  }

  async getRedisKey(index: string, key: string) {
    const loggerHeader = `${this.LOG_MESSAGE}getRedisKey`;
    let response;
    try {
      const redisIndex: any = await this.getRedisIndex(index);
      response = await redisIndex.get(key);
      response = JSON.parse(response);
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error getting redis key: ${key}`,
        error,
      );
    }
    return response;
  }

  async setRedisKey(index: string, key: string, data: any) {
    const loggerHeader = `${this.LOG_MESSAGE}setRedisKey`;
    let response;
    try {
      const redisIndex: any = await this.getRedisIndex(index);
      response = await redisIndex.set(key, JSON.stringify(data));
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error setting redis key: ${key}`,
        error,
      );
    }
    return response || 'Session stored correctly';
  }

  async setSession(session) {
    const loggerHeader = `${this.LOG_MESSAGE}setupSelenium`;
    let response;
    try {
      response = await this.sessionsRedis.set(
        `${session.targetName}:${session.username}`,
        JSON.stringify(session),
      );
    } catch (error) {
      response = `Error on redis set session: ${session.id}`;
      this.loggerService.error(`${loggerHeader}::Error setSession`, error);
    }
    return response || 'Session stored correctly';
  }

  async getSession(sessionId) {
    const loggerHeader = `${this.LOG_MESSAGE}getSession`;
    let response;
    try {
      response = await this.sessionsRedis.get(sessionId);
      response = JSON.parse(response);
    } catch (error) {
      response = `Error on redis get session: ${sessionId}`;
      this.loggerService.error(`${loggerHeader}::Error getSession`, error);
    }
    return response;
  }

  async setForumThreads(forumName, forumThreads) {
    const loggerHeader = `${this.LOG_MESSAGE}setForumThreads`;
    let response;
    const date = moment().format('YYYY-MM-DD');
    try {
      response = await this.sessionsRedis.set(
        `topics-${forumName}:${date}`,
        JSON.stringify(forumThreads),
      );
    } catch (error) {
      response = `Error on redis set forum threads: ${forumName}:${date}`;
      this.loggerService.error(`${loggerHeader}::Error setForumThreads`, error);
    }
    return response || 'Forum threads stored correctly';
  }

  async getForumThreads(forumName) {
    const loggerHeader = `${this.LOG_MESSAGE}getForumThreads`;
    let response;
    const date = moment().format('YYYY-MM-DD');
    try {
      response = await this.sessionsRedis.get(`topics-${forumName}:${date}`);
      response = JSON.parse(response);
    } catch (error) {
      response = `Error on redis get forum threads: ${forumName}:${date}`;
      this.loggerService.error(`${loggerHeader}::Error getForumThreads`, error);
    }
    return response;
  }

  async setForumPageByUser(key, pages) {
    const loggerHeader = `${this.LOG_MESSAGE}setForumThreads`;
    let response;
    try {
      response = await this.sessionsRedis.set(key, JSON.stringify(pages));
    } catch (error) {
      response = `Error on redis set forum page by user: ${key}`;
      this.loggerService.error(
        `${loggerHeader}::Error setForumPageByUser`,
        error,
      );
    }
    return response || 'Forum pages by user set correctly';
  }

  async getForumPageByUser(key) {
    const loggerHeader = `${this.LOG_MESSAGE}getForumPageByUser`;
    let response;
    try {
      response = await this.sessionsRedis.get(`${key}`);
      response = JSON.parse(response);
    } catch (error) {
      response = `Error on redis get forum page by: ${key}`;
      this.loggerService.error(
        `${loggerHeader}::Error getForumPageByUser`,
        error,
      );
    }
    return response;
  }

  async getAllKeyForum(forum, username) {
    const loggerHeader = `${this.LOG_MESSAGE}getAllKeyForum`;

    const forumName = `${forum}:${username}-*`;
    let response;
    try {
      response = await this.sessionsRedis.keys(forumName);
    } catch (error) {
      response = `Error on redis: ${forumName}`;
      this.loggerService.error(`${loggerHeader}::Error getAllKeyForum`, error);
    }
    return response;
  }

  async deleteKeyForum(keyDay) {
    //changed so that it deletes the connection info from the object but not the entire object to maintain the login error count
    const loggerHeader = `${this.LOG_MESSAGE}deleteKeyForum`;
    let response;
    try {
      response = await this.sessionsRedis.del(keyDay);
    } catch (error) {
      response = `Error on redis delete key forum: ${keyDay}`;
      this.loggerService.error(`${loggerHeader}::Error deleteKeyForum`, error);
    }
    return response;
  }

  async setSource(target) {
    const loggerHeader = `${this.LOG_MESSAGE}setSource`;
    let response;
    try {
      response = await this.sourcesRedis.set(
        `${target.sourceName}:${target.username}`,
        JSON.stringify(target),
      );
    } catch (error) {
      response = `Error on redis set source: ${target.id}`;
      this.loggerService.error(`${loggerHeader}::Error setSource`, error);
    }
    return response || 'Target stored correctly';
  }

  async getSource(targetId) {
    const loggerHeader = `${this.LOG_MESSAGE}getSource`;
    let response;
    try {
      response = await this.sourcesRedis.get(targetId);
      response = JSON.parse(response);
    } catch (error) {
      response = `Error on redis get source: ${targetId}`;
      this.loggerService.error(`${loggerHeader}::Error getSource`, error);
    }
    return response;
  }

  async deleteSource(targetId, resetErrorCount = true) {
    //changed so that it deletes the connection info from the object but not the entire object to maintain the login error count
    const loggerHeader = `${this.LOG_MESSAGE}deleteSource`;
    let response;
    try {
      const target = await this.getSource(targetId);
      if (target) {
        delete target.connectionInfo;
        if (resetErrorCount) target.loginErrorCount = 0;
        response = await this.setSource(target);
      }
    } catch (error) {
      response = `Error on redis delete source: ${targetId}`;
      this.loggerService.error(`${loggerHeader}::Error deleteSource`, error);
    }
    return response;
  }

  async deleteSession(session) {
    const loggerHeader = `${this.LOG_MESSAGE}deleteSession`;
    let response;
    try {
      response = await this.sessionsRedis.del(
        `${session.targetName}:${session.username}`,
      );
    } catch (error) {
      response = `Error on redis delete session: ${session.id}`;
      this.loggerService.error(`${loggerHeader}::Error deleteSession`, error);
    }
    return response;
  }

  async deleteAllSessions() {
    const loggerHeader = `${this.LOG_MESSAGE}deleteAllSessions`;
    let response;
    try {
      response = await this.sessionsRedis.flushdb();
    } catch (error) {
      response = 'Error deleting all sessions';
      this.loggerService.error(
        `${loggerHeader}::Error deleteAllSessions`,
        error,
      );
    }
    return response || 'All sessions deleted';
  }

  async getAllSessions() {
    const loggerHeader = `${this.LOG_MESSAGE}getAllSessions`;
    const allSessions: any = [];
    const sessionKeys: Array<string> = await this.sessionsRedis.keys('*');
    if (sessionKeys) {
      for (const sessionKey of sessionKeys) {
        try {
          const sessionString = await this.sessionsRedis.get(sessionKey);
          const session = JSON.parse(sessionString);
          allSessions.push(session);
        } catch (error) {
          this.loggerService.error(
            `${loggerHeader}::Error getAllSessions`,
            error,
          );
        }
      }
    }
    return allSessions;
  }

  async getSessionFromRedis(sessionId) {
    const loggerHeader = `${this.LOG_MESSAGE}getSessionFromRedis`;
    let response;
    try {
      const sessionString = await this.sessionsRedis.get(sessionId);
      if (sessionString) {
        const session = JSON.parse(sessionString);
        delete session.tasks;
        delete session.target;
        delete session.bins;
        delete session.siteInfo;
        response = session;
      }
    } catch (error) {
      response = `Error on redis get session: ${sessionId}`;
      this.loggerService.error(
        `${loggerHeader}::Error getSessionFromRedis`,
        error,
      );
    }
    return response;
  }

  async deleteSessionRedis(sessionId) {
    const loggerHeader = `${this.LOG_MESSAGE}deleteSessionRedis`;
    let response;
    try {
      response = await this.sessionsRedis.del(sessionId);
    } catch (error) {
      response = `Error on redis delete session: ${sessionId}`;
      this.loggerService.error(
        `${loggerHeader}::Error deleteSessionRedis`,
        error,
      );
    }
    return response;
  }

  async getAllSessionsRedis() {
    await Promise.resolve();
    return this.sessionsRedis.keys('*');
  }

  async editConnectionInfo(connectionInfo) {
    const sessionId = `${connectionInfo.target}:${connectionInfo.username}`;
    const session = await this.getSession(sessionId);
    session.connectionInfo = connectionInfo;
    this.setSession(session);
    return session.connectionInfo;
  }

  async deleteAllSessionsRedis() {
    await this.deleteAllSessions();
  }

  async setCard(card) {
    const loggerHeader = `${this.LOG_MESSAGE}setCard`;
    let response;
    try {
      response = await this.duplicateRedis.set(
        `${card.targetName}:${card.cardBin}:${card.shopId}`,
        JSON.stringify(card.value),
      );
    } catch (error) {
      response = `Error on redis set card: ${card}`;
      this.loggerService.error(`${loggerHeader}::Error setCard`, error);
    }
    return response || 'Card set correctly';
  }

  async getCard(cardId) {
    const loggerHeader = `${this.LOG_MESSAGE}getCard`;
    let response;
    try {
      response = await this.duplicateRedis.get(cardId);
      response = JSON.parse(response);
    } catch (error) {
      response = `Error on redis get getCard: ${cardId}`;
      this.loggerService.error(`${loggerHeader}::Error getCard`, error);
    }
    return response;
  }

  async setForum(key, forumDailyData) {
    const loggerHeader = `${this.LOG_MESSAGE}setForum`;
    let response;
    try {
      response = await this.duplicateRedis.set(
        key,
        JSON.stringify(forumDailyData),
      );
    } catch (error) {
      response = `Error on redis set forum: ${forumDailyData}`;
      this.loggerService.error(`${loggerHeader}::Error setForum`, error);
    }
    return response || 'Forum set correctly';
  }

  async setPhone(phone) {
    const loggerHeader = `${this.LOG_MESSAGE}setCard`;
    let response;
    try {
      response = await this.duplicateRedis.set(
        `${phone.targetName}:${phone.id}`,
        JSON.stringify(phone.value),
      );
    } catch (error) {
      response = `Error on redis set phone: ${phone}`;
      this.loggerService.error(`${loggerHeader}::Error setPhone`, error);
    }
    return response || 'Phone set correctly';
  }

  async setCardInfoInDuplicateIndex(
    key,
    source,
    isPhoneCollection = false,
    isDuplicated = false,
  ) {
    const loggerHeader = `${this.LOG_MESSAGE}setCardInfoInDuplicateIndex`;
    let response;

    try {
      const date = moment().format('YYYY-MM-DD');
      //Creating default objects
      const cardsData = {
        date,
        cards: 1,
        targetName: source,
      };
      const phoneData = {
        date,
        phones: 1,
        newInputs: !isDuplicated ? 1 : 0,
        targetName: source,
        status: 'InProgress',
      };

      // getting redis data
      const existing = await this.duplicateRedis.get(key);
      const exiObj = JSON.parse(existing);
      if (existing) {
        if (!isPhoneCollection) {
          //updating cards data
          cardsData.cards = exiObj.cards + 1;
        } else {
          //updating phone data
          phoneData.phones = exiObj.phones + 1;
          phoneData.newInputs = isDuplicated
            ? exiObj.newInputs
            : exiObj.newInputs + 1;
        }
      }
      // saving data to redis
      const dataToSave = isPhoneCollection ? phoneData : cardsData;
      response = await this.duplicateRedis.set(key, JSON.stringify(dataToSave));
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error setCardInfoInDuplicateIndex`,
        error,
      );
    }
    return response || 'Card set correctly';
  }

  async setPhoneData(key, data: any) {
    const loggerHeader = `${this.LOG_MESSAGE}::setPhoneData`;
    try {
      await this.duplicateRedis.set(key, JSON.stringify(data));
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error saving phoneCollection data`,
        error,
      );
    }
    return true;
  }

  async getDuplicateCardsByTargetName(targetName) {
    const loggerHeader = `${this.LOG_MESSAGE}getCard`;
    const allDuplicatedOfTarget: any = [];
    try {
      const responseKeys: Array<string> = await this.duplicateRedis.keys(
        `${targetName}:details*`,
      );
      if (responseKeys.length > 0) {
        for (const duplicatedCardKey of responseKeys) {
          try {
            const duplicatedCardString =
              await this.duplicateRedis.get(duplicatedCardKey);
            const duplicatedCard = JSON.parse(duplicatedCardString);
            allDuplicatedOfTarget.push(duplicatedCard);
          } catch (error) {
            this.loggerService.error(
              `${loggerHeader}::Error finding duplicated cards of target`,
              error,
            );
          }
        }
      }
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error getDuplicatedCards`,
        error,
      );
      return error;
    }
    return allDuplicatedOfTarget;
  }

  async getAllDuplicateCards() {
    const finalData: any = {};
    const alllDuplicateForAllTargets =
      await this.getDuplicateCardsByTargetName('*');

    for (const target of alllDuplicateForAllTargets) {
      if (finalData[target.targetName]) {
        finalData[target.targetName].push(target);
      } else {
        finalData[target.targetName] = [target];
      }
    }
    for (const target in finalData) {
      finalData[target].sort((a, b) => this.byDate(a, b));
      finalData[target] = finalData[target].slice(
        finalData[target].length - 7,
        finalData[target].length,
      );
    }

    return finalData;
  }
  byDate(a, b) {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return timeA - timeB;
  }

  async updateCurrentPage(sessionInfo) {
    const loggerHeader = `${this.LOG_MESSAGE}updateCurrentPage`;
    try {
      const sessionId = `${sessionInfo.targetName}:${sessionInfo.username}`;
      const session = await this.getSession(sessionId);
      const currentPage = sessionInfo.collectionData.currentPage;
      const currentBaseName: any = sessionInfo.collectionData.currentBaseName;
      if (!session) {
        throw new Error('Session not found to update current page');
      }
      if (session.collectionData.currentPage) {
        session.collectionData.currentPage = currentPage;
        session.collectionData.currentBaseName = currentBaseName;
      } else {
        this.loggerService.info(
          `${loggerHeader}::collectionData not found in session`,
        );
      }
      const response = await this.setSession(session);
      if (!response.includes('Error')) {
        // TODO: Check this
        const logInfo = currentBaseName
          ? `${loggerHeader}::collectionData was updated for current page #${currentPage} and baseName "${currentBaseName}"`
          : `${loggerHeader}::collectionData was updated for current page #${currentPage}`;
        this.loggerService.info(logInfo);
      } else {
        throw new Error(
          `${loggerHeader}::Session cannot be saved on REDIS, please retry.`,
        );
      }
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error on updateCurrentPage`,
        error,
      );
      throw error;
    }

    return true;
  }

  async savePhonePaginate(data: any) {
    const loggerHeader = `${this.LOG_MESSAGE}::savePhonePaginate`;
    try {
      await this.duplicateRedis.set(
        `${data.source}:currentSection`,
        JSON.stringify(data),
      );
    } catch (error) {
      this.loggerService.error(`${loggerHeader}::Error saving paginate`, error);
    }
    return true;
  }

  async getPhonePaginate(source: string) {
    const loggerHeader = `${this.LOG_MESSAGE}::getPhonePaginate`;
    let response;
    try {
      response = await this.duplicateRedis.get(`${source}:currentSection`);
      if (response) {
        response = JSON.parse(response);
      }
    } catch (error) {
      response = `Error on redis get phone paginate: ${source}`;
      this.loggerService.error(
        `${loggerHeader}::Error getPhonePaginate`,
        error,
      );
    }
    return response;
  }

  async deletePhoneNumberSession(key: string) {
    const loggerHeader = `${this.LOG_MESSAGE}::deletePhoneNumberSession`;
    let response;
    try {
      response = await this.duplicateRedis.del(key);
    } catch (error) {
      response = `Error on redis delete session: ${key}`;
      this.loggerService.error(
        `${loggerHeader}::Error on delete phone number session`,
        error,
      );
    }
    return response;
  }

  async getCoverNameWASP(coverNameKey) {
    const loggerHeader = `${this.LOG_MESSAGE}::getCoverNameWASP`;
    let response;
    try {
      response = await this.sourcesRedis.get(coverNameKey);
      if (response) {
        response = JSON.parse(response);
      }
    } catch (error) {
      response = `Error on redis get cover name WASP: ${coverNameKey}`;
      this.loggerService.error(
        `${loggerHeader}::Error getCoverNameWASP`,
        error,
      );
    }
    return response;
  }

  async setCoverNameWASP(params, coverNameKey) {
    const loggerHeader = `${this.LOG_MESSAGE}::setCoverNameWASP`;
    let response;
    try {
      response = await this.sourcesRedis.set(
        coverNameKey,
        JSON.stringify(params),
      );
    } catch (error) {
      response = `Error on redis set cover name WASP: ${params?.parent_source}`;
      this.loggerService.error(
        `${loggerHeader}::Error setCoverNameWASP`,
        error,
      );
    }
    return response || 'Cover name stored correctly';
  }

  async getForumPostsDataKeys(keyPattern: string) {
    const loggerHeader = `${this.LOG_MESSAGE}::getForumPostsDataKeys`;
    let result: any = null;
    try {
      const response = await this.duplicateRedis.keys(keyPattern);
      result = response;
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error getting login fail rule shops`,
        error,
      );
    }
    return result;
  }

  async acquireLock(
    key: string,
    value: any,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.sessionsRedis.set(
      key,
      JSON.stringify(value),
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }
}
