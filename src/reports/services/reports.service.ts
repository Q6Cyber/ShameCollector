import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../global/services/logger.service';
import { ElasticService } from '../../global/services/elastic.service';
import { RedisService } from '../../global/services/redis.service';
import lodash from 'lodash';
import moment from 'moment';

@Injectable()
export class ReportsService {
  private readonly LOG_MESSAGE = 'ReportsService';
  private forumPostsDataFullInformation = ['Card2Club'];
  constructor(
    protected loggerService: LoggerService,
    protected elasticService: ElasticService,
    protected redisService: RedisService,
  ) {}

  async getPostsById(batchPostIds): Promise<any> {
    try {
      const foundIds: any[] = [];
      for (const idBatch of batchPostIds) {
        const postsESresponse: any =
          await this.elasticService.getBulkPostsById(idBatch);
        if (postsESresponse) {
          foundIds.push(
            ...postsESresponse.body.hits.hits.map((doc) => doc._id),
          );
        }
      }
      return foundIds;
    } catch (error) {
      this.loggerService.error(
        `${this.LOG_MESSAGE}::getPostsById::Error getting posts by IDs`,
        error,
      );
      throw error;
    }
  }

  async getMissingIds(idPostArray, foundIds) {
    try {
      const missingIds: any[] = [];
      let missingCount = 0;
      for (const element of idPostArray) {
        if (!foundIds.includes(element)) {
          missingCount++;
          missingIds.push(element);
        }
      }
      await Promise.resolve();
      return { missingCount, missingIds };
    } catch (error) {
      this.loggerService.error(
        `${this.LOG_MESSAGE}::getMissingIds::Error getting posts by IDs`,
        error,
      );
      throw error;
    }
  }

  async mappingMissingIds(missingResults, postsFromSourceByDate, source) {
    let missingCount = 0;
    let missingIds: any[] = [];
    try {
      missingCount = missingResults?.missingCount || 0;
      missingIds = missingResults?.missingIds || [];
      if (source && this.forumPostsDataFullInformation.includes(source)) {
        missingIds = missingIds.map((id) => postsFromSourceByDate[id]);
      }
      await Promise.resolve();
    } catch (error) {
      this.loggerService.error(
        `${this.LOG_MESSAGE}::mappingMissingIds::Error mapping missing Ids`,
        error,
      );
    }
    return {
      missingCount,
      missingIds,
    };
  }

  async checkPostsByDate(date: string, source: string): Promise<any> {
    try {
      const badResponse = { missingIds: [], idsFromTheDate: 0 };
      const key = `ForumPostsData:${source}:${date}`;
      const postsFromSourceByDate = await this.redisService.getCard(key);
      if (!postsFromSourceByDate) return badResponse;
      const idPostArray = Object.keys(postsFromSourceByDate);
      const idPostArrayByGroup = lodash.chunk(idPostArray, 500);
      if (idPostArray.length === 0) return badResponse;
      const foundIds = await this.getPostsById(idPostArrayByGroup);
      const missingResults = await this.getMissingIds(idPostArray, foundIds);
      const { missingCount, missingIds } = await this.mappingMissingIds(
        missingResults,
        postsFromSourceByDate,
        source,
      );
      const allExist = missingCount === 0;
      return {
        missingIds,
        allExist,
        idsFromTheDate: idPostArray.length,
      };
    } catch (error) {
      this.loggerService.error(
        `${this.LOG_MESSAGE}::checkPostsByDate::Error checking posts by date and source`,
        error,
      );
      throw error;
    }
  }

  async checkPostsFromForums(): Promise<any> {
    try {
      const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
      const yesterdayKey = `ForumPostsData:*:${yesterday}`;
      const yesterdayForumKeys =
        await this.redisService.getForumPostsDataKeys(yesterdayKey);

      for (const yesterdayForumKey of yesterdayForumKeys) {
        const source = yesterdayForumKey.split(':')[1];
        const postsFromSourceByDate =
          await this.redisService.getCard(yesterdayForumKey);
        const idPostArray = Object.keys(postsFromSourceByDate);
        const idPostArrayByGroup = lodash.chunk(idPostArray, 500);
        const foundIds = await this.getPostsById(idPostArrayByGroup);
        const missingResults = await this.getMissingIds(idPostArray, foundIds);
        const { missingCount, missingIds } = await this.mappingMissingIds(
          missingResults,
          postsFromSourceByDate,
          source,
        );
        if (missingCount > 0) {
          const key = `ForumDailyStats:${source}:NotFound:${yesterday}`;
          await this.redisService.setForum(key, {
            count: missingCount,
            missingIds,
          });
          this.loggerService.info(
            `CollectionService::checkPostsByDate::Found ${missingCount} missing posts for forum: ${source} from ${yesterday}`,
          );
        }
      }
      this.loggerService.info(
        `CollectionService::checkPostsByDate::Finished checking posts by date and source, from ${yesterday} for forums: ${yesterdayForumKeys
          .map((x) => x.split(':')[1])
          .join(', ')}`,
      );

      return true;
    } catch (error) {
      this.loggerService.error(
        `${this.LOG_MESSAGE}::checkPostsFromForums::Error checking posts by date and source`,
        error,
      );
      throw error;
    }
  }
}
