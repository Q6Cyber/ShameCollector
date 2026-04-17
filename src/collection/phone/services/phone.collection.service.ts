/* eslint @typescript-eslint/no-var-requires: "off" */
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../global/services/logger.service';
import { Parsers } from '../../helpers/parsers';
import {
  // SessionInfoConfig,
  SiteInfo,
  PhoneCollectionConfig,
} from '../../models/shop.model';
// const { By } = require('selenium-webdriver');
// import { SeleniumService } from '../../services/selenium.service';
import { RedisService } from '../../../global/services/redis.service';
import { PubsubService } from '../../../global/services/pubsub.service';
// import * as lodash from 'lodash';
// import {
//   isPhoneGrpcCompliant,
//   parseJSONPhoneToProto,
// } from '../../../helpers/GrpcValidation';
import { GlobalService } from '../../../global/services/global.service';
import { ElasticService } from '../../../global/services/elastic.service';
import { ProcessResult } from '../../../common/enums';
// import sleep from 'await-sleep';
// const moment = require('moment');
// const fs = require('fs');
// const path = require('path');

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
 * @description Phone service (Parent class) in charge of handle the search process inside a phone shop
 * @export
 * @abstract
 * @class PhoneCollectionService
 */
@Injectable()
export class PhoneCollectionService {
  protected LOG_MESSAGE: string;
  protected morePages = true;
  protected onLoading = true;
  protected onLoadingRefresh = true;
  protected hasCloudFlare = false;
  protected tabOpen = false;
  protected keepSeleniumSession = false;
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
  protected postVisited = 0;
  protected searchStructure = [];
  // protected parentUrl;
  protected stopSearchPost = false;
  // protected threadSearch;
  protected rawPosts = []; // Object got it from shop
  protected parsedRawPosts = []; // Card raw parsed from shop
  protected parsedRawPostsLog = []; // Card raw parsed from shop
  protected parsedForumMessages = []; // Card already parsed
  protected filters: any[];
  protected siteInfo: SiteInfo = {};
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
  // protected currentResponse;
  // protected currentURL;
  protected firstExecSetup = true;
  protected pageUser = 0;
  protected checkUserPages = false;
  // protected checkUserStatus;
  // protected initialUrl: string = null;
  protected seleniumTimeOutsScript = 120000;
  protected seleniumTimeOutsPageLoad = 120000;
  protected seleniumTimeOutsImplicit = 0;
  protected currentThreadPage = 1;
  protected saveCurrentSectionFlag = true;
  protected pagesWithOutNewDataLimitCount = 10;
  protected isClickAction = false;

  protected setupRecipe = ['setupSelenium'];
  protected shopRecipe = ['goTo', 'awaitingTime', 'searchProcess'];

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
  protected redisService: RedisService;
  protected parsers: Parsers;
  protected pubsubService: PubsubService;
  protected globalService: GlobalService;
  protected elasticService: ElasticService;
  protected takeScreenshot = false;
  protected searchUrls: any = [];
  protected currentSearchUrl = {
    url: '',
    isActive: false,
    pathData: '',
    pagePath: '',
    phonePath: '',
  };
  protected currentPageUrl = '';

  /**
   *Creates an instance of PhoneCollectionService.
   * @param {string} source
   * @param {*} cardToBuy
   * @memberof ShopCollectionService
   */
  constructor(params: PhoneCollectionConfig) {
    this.source = params.source;
    this.user = params.user;
    this.sessionId = params.sessionId;
    this.filters = params.filters || [];
    this.loggerService = params.loggerService;
    this.parsers = params.parsers;

    this.redisService = params.redisService;
    // this.sessionInfo = params.sessionInfo;
    this.pubsubService = params.pubsubService;
    this.globalService = params.globalService;
    this.credType = params.credType;
    this.LOG_MESSAGE = `PhoneCollectionService::${this.source}`;
    this.siteInfo = {
      sessionId: `${params.source}`,
      source: params.source,
    };
    this.takeScreenshot = params.takeScreenshot || false;
    this.elasticService = params.elasticService;
  }
}
