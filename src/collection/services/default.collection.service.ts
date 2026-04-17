/* eslint @typescript-eslint/no-var-requires: "off" */
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../global/services/logger.service';
import { Parsers } from '../helpers/parsers';
import {
  SessionInfoConfig,
  SiteInfo,
  DefaultCollectionConfig,
} from '../models/shop.model';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { By } = require('selenium-webdriver');
import { SeleniumService } from './selenium.service';
import { RedisService } from '../../global/services/redis.service';
import { PubsubService } from '../../global/services/pubsub.service';
import * as lodash from 'lodash';
import {
  isPhoneGrpcCompliant,
  parseJSONPhoneToProto,
} from '../../helpers/GrpcValidation';
import { GlobalService } from '../../global/services/global.service';
import { ElasticService } from '../../global/services/elastic.service';
import { ErrorCustomCode, ProcessResult } from '../../common/enums';
import sleep from 'await-sleep';
import moment from 'moment';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

interface Selectors {
  loadingElement: string;
  pagination?: string;
  pathData: string;
  balance?: string;
  paginationElement?: string;
  urlParam?: string;
  urlTail?: string;
  isValidElement?: string;
  countryPath: string;
  phonePath: string;
  modalElement?: string;
}

/**
 * @description DefaultCollection service (Parent class) in charge of handle the search process inside a website
 * @export
 * @abstract
 * @class DefaultCollectionService
 */
@Injectable()
export class DefaultCollectionService {
  protected LOG_MESSAGE: string;
  protected morePages = true;
  protected onLoading = true;
  protected onLoadingRefresh = true;
  protected hasCloudFlare = false;
  protected tabOpen = false;
  protected keepSeleniumSession = false;
  protected sessionInfo: SessionInfoConfig;
  protected privateUrl;
  protected replaceUrl = false;
  protected logForumMessages = false;
  protected checkDuplicateCard = true;
  protected hashProps = [
    'number',
    'international',
    'national',
    'country',
    'is_active',
  ];
  protected responseDecoder;
  protected postVisited = 0;
  protected searchStructure = [];
  protected parentUrl;
  protected stopSearchPost = false;
  protected threadSearch;
  protected rawPosts = []; // Object got it from shop
  protected parsedRawPosts = []; // Card raw parsed from shop
  protected parsedRawPostsLog = []; // Card raw parsed from shop
  protected parsedForumMessages: any = []; // Card already parsed
  protected filters: any[];
  protected currentPage = 1;
  protected waitUntilElement = 30000;
  protected validateLoadingTime = 5000;
  protected credType: string;
  public sessionExpired = false;
  protected shopStatus = ProcessResult.SUCCESS;
  protected currentIndexCard = 0;
  protected waitBeforeTestBrowser = 1000;
  protected loadingTries = 10;
  protected currentSearch = '';
  protected currentResponse;
  protected currentURL;
  protected firstExecSetup = true;
  protected pageUser = 0;
  protected checkUserPages = false;
  protected checkUserStatus;
  protected initialUrl: string = '';
  protected seleniumTimeOutsScript = 120000;
  protected seleniumTimeOutsPageLoad = 120000;
  protected seleniumTimeOutsImplicit = 0;
  protected currentThreadPage = 1;
  protected saveCurrentSectionFlag = true;
  protected pagesWithOutNewDataLimitCount = 10;
  protected isClickAction = false;

  protected setupRecipe = ['setupSelenium'];
  protected shopRecipe = ['goTo', 'awaitingTime'];

  protected shopPaginateRecipe = [
    'getRawData',
    'parserRawData',
    'parseMessages',
    'sendToPubSub',
    'checkPagesWithOutNewDataExit',
    'paginate',
  ];

  protected selectors: Selectors = {
    loadingElement: '',
    pathData: '',
    paginationElement: '',
    urlParam: '',
    urlTail: '',
    isValidElement: '',
    countryPath: '',
    phonePath: '',
    modalElement: '',
  };

  protected readonly source: string;
  protected readonly user: string;
  protected readonly sessionId: string;
  protected loggerService: LoggerService;
  public seleniumService: SeleniumService;
  protected redisService: RedisService;
  protected parsers: Parsers;
  protected pubsubService: PubsubService;
  protected globalService: GlobalService;
  protected elasticService: ElasticService;
  protected takeScreenshot = false;
  protected searchUrls: any = [];
  protected currentSearchUrl = {
    url: '',
    pathData: '',
    pagePath: '',
    phonePath: '',
  };
  protected currentPageUrl = '';

  /**
   * Creates an instance of DefaultCollectionService.
   * @param {DefaultCollectionConfig} params
   * @memberof DefaultCollectionService
   */
  constructor(params: DefaultCollectionConfig) {
    this.source = params.source;
    this.user = params.user;
    this.loggerService = params.loggerService;
    this.parsers = params.parsers;

    this.redisService = params.redisService;
    this.pubsubService = params.pubsubService;
    this.globalService = params.globalService;
    this.LOG_MESSAGE = `PhoneCollectionService::${this.source}`;

    this.takeScreenshot = params.takeScreenshot || false;
    this.elasticService = params.elasticService;
    this.sessionInfo = params.sessionInfo;
  }

  protected async openNewTab(url) {
    const loggerHeader = `${this.LOG_MESSAGE}::openNewTab`;
    try {
      await this.seleniumService.driver.get(url);
      await this.seleniumService.driver.executeScript(
        `window.open("${url}","_blank");`,
      );
      await sleep(20000);
      this.tabOpen = true;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error open new tab`,
        error,
      );
      throw error;
    }
  }

  protected async checkSeleniumSessions(seleniumSessionToCheck) {
    const loggerHeader = `${this.LOG_MESSAGE}::checkSeleniumSessions`;
    try {
      let sessionExist = false;
      const seleniumSessions =
        await this.globalService.getSeleniumGridSessionIds();
      for (const seleniumSession of seleniumSessions) {
        for (const session of seleniumSession.sessions) {
          if (session.id === seleniumSessionToCheck) {
            sessionExist = true;
            break;
          }
        }
      }
      return sessionExist;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error getting selenium node info`,
        error,
      );
      throw error;
    }
  }

  /**
   * @description Method for setup the selenium
   * @protected
   * @memberof DefaultCollectionService
   */
  protected async setupSelenium(): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::setupSelenium`;
    try {
      const sessionInfo = this.sessionInfo
        ? this.sessionInfo
        : await this.redisService.getSession(`${this.source}:${this.user}`);
      this.sessionInfo = sessionInfo;
      if (sessionInfo.connectionInfo) {
        const connectionInfoResult = sessionInfo.connectionInfo;
        const { localStorage, seleniumSession } = connectionInfoResult;
        /* eslint-disable camelcase */
        const { driver_type, proxy } = connectionInfoResult;
        const url = connectionInfoResult.url;
        this.parentUrl = url;
        if (this.initialUrl) {
          this.parentUrl = this.initialUrl ? `${url}${this.initialUrl}` : url;
          this.currentURL = this.parentUrl;
        }
        this.seleniumService = new SeleniumService(
          this.loggerService,
          driver_type,
          proxy,
          this.hasCloudFlare,
          this.source,
        );
        if (seleniumSession) {
          const { selenium_session_id } = seleniumSession;
          const existSession =
            await this.checkSeleniumSessions(selenium_session_id);
          this.tabOpen = this.sessionInfo.connectionInfo.hasCloudFlare;
          if (existSession) {
            await this.seleniumService.connectToBrowser({
              seleniumSessionId: selenium_session_id,
            });
            // setup timeouts by default
            this.seleniumService.driver.manage().setTimeouts({
              script: this.seleniumTimeOutsScript,
              pageLoad: this.seleniumTimeOutsPageLoad,
              implicit: this.seleniumTimeOutsImplicit,
            });
            if (this.keepSeleniumSession) {
              const initialUrl = this.initialUrl
                ? `${url}${this.initialUrl}`
                : url;
              await this.seleniumService.driver.get(initialUrl);
            }
            await sleep(this.waitBeforeTestBrowser);
            if (this.hasCloudFlare) {
              await this.openNewTab(url);
            }
            await this.testConnectedBrowser();
            return true;
          } else {
            throw new Error(
              `The session ${selenium_session_id} for ${this.source}::${this.user} was not found in Selenium GRID`,
            );
          }
        }
        try {
          await this.seleniumService.initializeDriver();
          this.seleniumService.driver.manage().setTimeouts({
            script: this.seleniumTimeOutsScript,
            pageLoad: this.seleniumTimeOutsPageLoad,
            implicit: this.seleniumTimeOutsImplicit,
          });
          if (this.hasCloudFlare) {
            await this.openNewTab(url);
          } else {
            await this.seleniumService.driver.get(this.parentUrl);
            await sleep(10000);
            return;
          }
        } catch (error) {
          const errorResult = {
            error,
            msg: `${loggerHeader}::Error getting selenium browser.`,
            type: ErrorCustomCode.SELENIUM_ERROR,
          };
          throw errorResult;
        }
        if (!localStorage) {
          try {
            await this.seleniumService.driver.manage().deleteAllCookies();
            await this.seleniumService.setCookies(
              sessionInfo.connectionInfo.cookies,
            );
          } catch (error) {
            this.sessionExpired = true;
          }
        } else {
          const { item } = localStorage;
          await this.seleniumService.driver.executeScript(
            function () {
              // eslint-disable-next-line
              return localStorage.setItem(arguments[0], arguments[1]);
            },
            item,
            connectionInfoResult.cookies,
          );
        }
        await this.seleniumService.driver.get(url);
      } else {
        throw new Error(
          `The session for Shop ${this.source}:${this.user} has expired`,
        );
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error setting selenium`,
        error,
      );
      throw error;
    }
    await sleep(4000);
    return true;
  }

  protected async testConnectedBrowser() {
    const loggerHeader = `${this.LOG_MESSAGE}::testConnectedBrowser`;
    try {
      await this.seleniumService.driver.findElement(
        By.css(this.selectors.balance),
      );
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error testing connected browser`,
        error,
      );
      throw Error('Session doesnt exist');
    }
  }

  protected async refreshPage() {
    const loggerHeader = `${this.LOG_MESSAGE}::refreshPage`;
    try {
      await this.seleniumService.driver.navigate().refresh();
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error refreshing the page`,
        error,
      );
      throw error;
    }
  }

  protected async processSections(): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::processSections`;
    try {
      this.onLoadingRefresh = true;
      this.onLoading = true;
      this.shopStatus = ProcessResult.SUCCESS;
      await this.processRecipe();
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error processing sections`,
        error,
      );
      throw error;
    }
    return true;
  }

  protected async processShop(): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::processShop`;
    let result = {};
    try {
      await this.processSections();
      const action = 'FINISHED_COLLECTION';
      const msg = 'Collection finished';
      result = {
        sourceName: this.source,
        userName: this.user,
        credType: this.credType,
        status: true,
        action,
        msg: msg,
      };
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error processing shop`,
        error,
      );
      result = {
        sourceName: this.source,
        userName: this.user,
        credType: this.credType,
        status: false,
        action: 'ERROR',
        msg: error.message,
      };
    }
    result = {
      ...result,
      sessionExpired: this.sessionExpired,
    };
    return result;
  }

  protected async processRecipe(): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::processRecipe`;
    try {
      let redisCurrentSection;
      //iterate over searchUrls
      if (this.searchUrls.length === 0) {
        this.searchUrls.push({ url: this.initialUrl, pagePath: '' });
      }
      // getting current section from redis
      // if (this.saveCurrentSectionFlag) {
      //   redisCurrentSection = await this.redisService.getPhonePaginate(
      //     this.source,
      //   );
      //   // check if is new day at collection
      //   const today = moment();
      //   const todayCheck = today.format('YYYY-MM-DD');
      //   const redisDate = lodash.get(redisCurrentSection, ['date'], '');
      //   if (redisDate !== todayCheck) {
      //     // delete from redis
      //     await this.redisService.deletePhoneNumberSession(
      //       `${this.source}:currentSection`,
      //     );
      //     redisCurrentSection = null;
      //   }
      // }

      for (const searchUrl of this.searchUrls) {
        this.currentPage = 1;
        // if (redisCurrentSection) {
        //   if (searchUrl.url !== redisCurrentSection.currentPageUrl) {
        //     continue;
        //   } else {
        //     this.currentPage = redisCurrentSection.currentPage;
        //     redisCurrentSection = null;
        //   }
        // }
        this.currentPageUrl = searchUrl.url;
        this.currentSearchUrl = searchUrl;
        this.parentUrl = `${this.sessionInfo.connectionInfo.url}${searchUrl.url}`;
        if (this.currentPage > 1) {
          this.parentUrl = this.handlePagination(
            this.sessionInfo.connectionInfo.url,
            searchUrl.url,
            this.currentPage,
          );
        }
        this.currentURL = this.parentUrl;
        this.morePages = true;
        this.shopStatus = ProcessResult.SUCCESS;
        for (const theFunction of this.shopRecipe) {
          if (this.shopStatus === ProcessResult.SUCCESS) {
            await this.loggerService.info(
              `${loggerHeader}Executing function: ${theFunction}`,
            );
            await this[theFunction]();
            await this.screenShot();
            await this.loggerService.info(
              `${loggerHeader}Finished function: ${theFunction}`,
            );
          }
        }
      }
      // delete from redis
      // await this.redisService.deletePhoneNumberSession(
      //   `${this.source}:currentSection`,
      // );
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error processing shop recipe`,
        error,
      );
      throw error;
    }
  }

  protected async screenShot() {
    const loggerHeader = `${this.LOG_MESSAGE}::screenShot`;
    try {
      const source = this.source;
      const user = this.user;
      if (this.takeScreenshot) {
        const folderShopUser = `${process.env.PATH_ROOT}/imgLogs/${this.source}/${this.user}`;
        this.seleniumService.driver
          .takeScreenshot()
          .then(function (image, err) {
            if (!fs.existsSync(folderShopUser)) {
              fs.mkdirSync(folderShopUser, {
                recursive: true,
              });
            }
            const imgLogPath = `${folderShopUser}/${source}:${user}:${new Date().getTime()}.png`;
            fs.writeFile(
              `${imgLogPath}`,
              image,
              'base64',
              function (errorFile) {
                this.loggerService.error(JSON.stringify(errorFile));
              },
            );
          });
      }
    } catch (error) {
      await this.loggerService.info(
        `${loggerHeader}::Error on taking screenshot`,
      );
    }
  }

  protected async searchProcess() {
    const loggerHeader = `${this.LOG_MESSAGE}::searchProcess`;
    try {
      while (this.morePages) {
        for (const searchFunction of this.shopPaginateRecipe) {
          if (this.shopStatus === ProcessResult.SUCCESS) {
            await this.loggerService.info(
              `${loggerHeader}Executing function search process: ${searchFunction}`,
            );
            await this[searchFunction]();
            await this.screenShot();
            await this.loggerService.info(
              `${loggerHeader}Finished function search process: ${searchFunction}`,
            );
          }
        }
      }
    } catch (error) {
      await this.loggerService.info(`${loggerHeader}::Error on search process`);
      throw error;
    }
    return true;
  }

  protected async setupTargetIterator() {
    const loggerHeader = `${this.LOG_MESSAGE}::setupTargetIterator`;
    try {
      for (const theFunction of this.setupRecipe) {
        await this.loggerService.info(
          `${loggerHeader}Executing function setupTargetIterator: ${theFunction}`,
        );
        await this[theFunction]();
        await this.loggerService.info(
          `${loggerHeader}Finished function setupTargetIterator: ${theFunction}`,
        );
      }
      this.firstExecSetup = false;
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error on setupTargetIterator`,
        error,
      );
      throw error;
    }
  }

  protected async goTo() {
    return true;
  }

  protected async getSourceText() {
    const loggerHeader = `${this.LOG_MESSAGE}::getSourceText`;
    let result = '';
    try {
      result = await this.seleniumService.driver.getPageSource();
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error getting page source`,
        error,
      );
      throw error;
    }
    return result;
  }

  protected async getRawData() {
    return true;
  }

  protected async writeData() {
    const loggerHeader = `${this.LOG_MESSAGE}::writeData`;
    try {
      const folderPosts = `${process.env.PATH_ROOT}phone/`;
      if (!fs.existsSync(folderPosts)) {
        fs.mkdirSync(folderPosts, {
          recursive: true,
        });
      }
      const tempThreadTitle = this.threadSearch.threadTitle.replace(/\//g, '');
      const imgLogPath = `${folderPosts}${tempThreadTitle}-phone-page-${
        this.currentPage - 1
      }.json`;
      fs.writeFile(
        `${imgLogPath}`,
        JSON.stringify(this.parsedRawPosts),
        function (errorFile) {
          console.log(errorFile);
        },
      );
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(true);
        }, 1500);
      });
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error writing phone messages...`,
        error,
      );
    }
  }

  protected async dataParser(post: any, index = 0): Promise<boolean> {
    await this.loggerService.info(`${JSON.stringify(post)}`);
    return true;
  }

  protected async parserRawData(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::parserRawData`;
    try {
      this.parsedRawPosts = [];
      for (const [index, card] of this.rawPosts.entries()) {
        await this.dataParser(card, index);
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error on parserRawData`,
        error,
      );
      throw error;
    }
    return true;
  }

  public async sendToPubSub(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::sendToPubSub`;
    let result = false;
    try {
      if (process.env.SEND_TO_PUBSUB_FLAG === '1') {
        await this.pubsubService.sendToPubSubPhone(
          'ElasticPersistProto',
          this.parsedForumMessages,
        );
      }
      if (
        this.parsedRawPosts.length > 0 &&
        process.env.ENVIRONMENT !== 'production'
      ) {
        await this.writeData();
        this.postVisited++;
      }
      result = true;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error on sendToPubSub`,
        error,
      );
      throw error;
    }

    return result;
  }

  protected async getForumMessageInfo(message) {
    const loggerHeader = `${this.LOG_MESSAGE}::getForumMessageInfo`;
    const parseMessage = null;
    try {
      const url = lodash.get(
        message,
        'message.to_details[0].forum_thread_details.url',
        '',
      );
      const eventTime = lodash.get(message, 'eventTime', '');
      const seq = lodash.get(message, 'message.seq_no', '');
      const userPost = lodash.get(message, 'message.from_details.username', '');
      const forum = lodash.get(message, 'collectionInfo.parent_source', '');
      const userName = lodash.get(
        message,
        'message.collection_user_details.username',
        '',
      );
      return {
        url,
        eventTime,
        seq,
        userPost,
        forum,
        userName,
      };
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error parsing phone number message to log`,
        error,
      );
      throw error;
    }
    return parseMessage;
  }

  protected async savePhoneInfo(phone) {
    const loggerHeader = `${this.LOG_MESSAGE}::savePhoneInfo`;
    try {
      const data = phone.contentHash;
      const value = { data, updateAt: new Date().toISOString() };
      const phoneRedis = {
        targetName: this.source,
        id: phone.id,
        value,
      };
      await this.redisService.setPhone(phoneRedis);
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error on savePhoneInfo`,
        error,
      );
      throw error;
    }
    return true;
  }

  protected async isDuplicatePhone(phone) {
    const loggerHeader = `${this.LOG_MESSAGE}::isDuplicatePhone`;
    let result = false;
    try {
      // get phone from redis
      const redisPhone = await this.redisService.getCard(
        `${this.source}:${phone.id}`,
      );
      const phoneHashData = await this.parsers.generateSourceToHash(
        phone,
        this.hashProps,
      );
      phone = {
        ...phone,
        contentHash: phoneHashData,
      };
      if (redisPhone) {
        result = redisPhone.data === phoneHashData ? true : false;
        // set new phone hash
        redisPhone.data = phoneHashData;
        //set new date redis phone
        redisPhone.updateAt = new Date().toISOString();

        const updatedPhone = {
          targetName: this.source,
          id: phone.id,
          value: redisPhone,
        };
        // save phone information in redis
        await this.redisService.setPhone(updatedPhone);
      } else {
        await this.savePhoneInfo(phone);
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error on isDuplicatePhone`,
        error,
      );
      throw error;
    }
    return result;
  }

  public async parseMessages(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::parseMessages`;
    let result = false;
    try {
      this.parsedForumMessages = [];
      this.parsedRawPostsLog = [];
      this.parsedRawPosts = this.parsedRawPosts.filter((x) => x);
      for (const phoneMessage of this.parsedRawPosts) {
        let isDuplicated = false;
        const grpcCheck = isPhoneGrpcCompliant(phoneMessage);
        if (!grpcCheck) {
          await this.loggerService.error(
            `ENTRY PHONE MESSAGE WITH MODEL ERROR: ${JSON.stringify(
              phoneMessage,
            )}`,
          );
        }

        if (this.checkDuplicateCard) {
          // key to verify in redis
          const date = moment().format('YYYY-MM-DD');
          const key = `PhoneDailyStats:${this.source}:${date}`;
          //verify duplicate phone in redis
          isDuplicated = await this.isDuplicatePhone(phoneMessage);
          await this.redisService.setCardInfoInDuplicateIndex(
            key,
            this.source,
            true,
            isDuplicated,
          );
        }

        if (phoneMessage && grpcCheck && !isDuplicated) {
          const entryParsedToGRPC = parseJSONPhoneToProto(phoneMessage);
          const entryParsed = {
            ...entryParsedToGRPC,
          };
          this.parsedForumMessages.push(entryParsed);
          if (
            process.env.SAVE_FORUM_MESSAGES_LOG === 'true' &&
            this.logForumMessages
          ) {
            this.parsedRawPostsLog.push(phoneMessage);
          }
        }
      }
      await this.loggerService.info(
        `${loggerHeader}::PHONE MESSAGES FOUND: ${this.parsedForumMessages.length}`,
      );
      if (this.parsedForumMessages.length > 0) {
        await this.loggerService.info(
          `${loggerHeader}::PARSED PHONE MESSAGES: ${JSON.stringify(
            this.parsedForumMessages[0],
          )}`,
        );
        await this.savePaginate(false, true);
      } else {
        // save pages without new data counter
        await this.savePaginate(true);
      }

      result = true;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error parsing the phone number messages`,
        error,
      );
      throw error;
    }
    return result;
  }

  protected async addCurrentThreadPage() {
    this.currentThreadPage++;
  }

  protected countryMapping(country) {
    let result = '';
    switch (country) {
      case 'United States of America':
      case 'United States':
      case 'USA':
      case 'US':
        result = 'US';
        break;
    }
    return result;
  }

  public async quitDriver() {
    const loggerHeader = `${this.LOG_MESSAGE}::quitDriver`;
    try {
      if (
        lodash.get(this.seleniumService, 'driver', null) &&
        !this.keepSeleniumSession
      ) {
        await this.seleniumService.driver.quit();
        await this.loggerService.info(
          `${loggerHeader}::Closing browser::${this.source}:${this.user}`,
        );
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error on quitDriver`,
        error,
      );
    }
  }

  protected async awaitingTime() {
    await sleep(this.waitUntilElement);
  }

  protected async handlePagination(url, currentSectionUrl, currentPage) {
    const loggerHeader = `${this.LOG_MESSAGE}::handlePagination`;
    let result = '';
    try {
      result = `${url}${currentSectionUrl}${this.selectors.urlParam}${currentPage}${this.selectors.urlTail}`;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error getting next pagination url`,
        error,
      );
      throw error;
    }
    return result;
  }

  protected async savePaginate(
    addPageNoData = false,
    clearCounterFlag = false,
  ) {
    const loggerHeader = `${this.LOG_MESSAGE}::savePaginate`;
    let pagesWithOutNewData: any = [];
    try {
      if (this.saveCurrentSectionFlag) {
        await this.loggerService.info(
          `${loggerHeader}: Saving Paginate #${this.currentPage}`,
        );

        const redisData = await this.redisService.getPhonePaginate(this.source);
        if (redisData) {
          pagesWithOutNewData = redisData.pagesWithOutNewData
            ? redisData.pagesWithOutNewData
            : [];
        }
        // saving pages without new data counter
        if (addPageNoData) {
          pagesWithOutNewData.push({ page: this.currentPage });
        }

        // clear pages without new data counter
        if (clearCounterFlag) {
          pagesWithOutNewData = [];
        }
        // setting date of collection
        const today = moment();

        // data to save in redis
        const data = {
          source: this.source,
          currentPage: this.currentPage,
          currentPageUrl: this.currentPageUrl,
          pagesWithOutNewData,
          date: today.format('YYYY-MM-DD'),
          lastUpdatedTime: new Date().toISOString(),
        };
        await this.redisService.savePhonePaginate(data);
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error saving paginate`,
        error,
      );
      throw error;
    }
    return true;
  }

  protected async checkPagesWithOutNewDataExit() {
    const loggerHeader = `${this.LOG_MESSAGE}::checkPagesWithOutNewDataExit`;
    try {
      const redisData = await this.redisService.getPhonePaginate(this.source);
      if (redisData) {
        const pagesWithOutNewData = redisData.pagesWithOutNewData
          ? redisData.pagesWithOutNewData
          : [];
        if (pagesWithOutNewData.length >= this.pagesWithOutNewDataLimitCount) {
          this.morePages = false;
          this.shopStatus = ProcessResult.END_OF_STORE;
        }
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error checking pages without new data exit process`,
        error,
      );
      throw error;
    }
    return true;
  }
}
