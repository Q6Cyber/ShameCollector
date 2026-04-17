import { SeleniumService } from '../services/selenium.service';
import { RedisService } from '../../global/services/redis.service';
import { LoggerService } from '../../global/services/logger.service';
import { Parsers } from '../helpers/parsers';
import { PubsubService } from '../../global/services/pubsub.service';
import { RequestService } from '../../services/request.service';
import { GlobalService } from '../../global/services/global.service';
import { ElasticService } from '../../global/services/elastic.service';

/**
 * @description Parameters used for set the shop properties on the constructor
 * @export
 * @class CollectionConfig
 */
export class CollectionConfig {
  source: string;
  user: string;
  sessionId: string;
  loggerService: LoggerService;
  parsers: Parsers;
  seleniumService: SeleniumService;
  redisService: RedisService;
  searchCriterias: any;
  sessionInfo: SessionInfoConfig;
  pubsubService: PubsubService;
  globalService: GlobalService;
  requestService: RequestService;
  filters?: any[];
  credType: string;
  takeScreenshot?: boolean;
  isCollection: boolean;
  elasticService: ElasticService;
}

/**
 * @description Parameters used for set the connectionInfo
 * @export
 * @class SessionInfoConfig
 */
export class SessionInfoConfig {
  id?: string;
  targetName?: string;
  username?: string;
  startTime?: any;
  lastUpdatedTime?: any;
  target?: any;
  reaper?: any;
  connectionInfo: any;
  collectionData?: any;
  binStats?: any;
  action?: string;
}

/**
 * @description Interface to search in different sections on the shop
 * @export
 * @class SearchSections
 */
export class SearchSection {
  url: string;
  acceptLast4: boolean;
  parser: string;
  pagination?: string;
  needEnhanceUser: boolean;
  textValidateSearch?: string[];
  textValidateSearchElement?: string;
  waitPaginate?: number;
  btnSearch?: string;
  waitPaginateElement?: string;
  txtBins?: string;
  initTextValidation?: string;
  extraCardInfoPath?: string;
  linkElement?: string;
  pathTable?: string;
  pathTableCollection?: string;
  pathDataHearders?: string;
  pathDataRow?: string;
  pathRowInfo?: string;
  cardSource: string;
  shopIdcardSource?: string;
  cardBinCss?: string;
  basenameRgx?: string;
  accountHolderStateRgx?: string;
  accountHolderZipRgx?: string;
  cardLevelCss?: string;
  cardTypeCss?: string;
  cardCountryCss?: string;
  cardCountryCssAttr?: {
    cardCountryCss: string;
    cardCountryAttr: string;
  };
  cardBankNameCssAttr?: {
    cardBankNameCss: string;
    cardBankNameAttr: string;
  };
  cardTypeRgx?: string;
  cardLevelRgx?: string;
  cardBankNameRgx?: string;
  extraCard?: {
    pathDataRow?: string;
    pathDataHeaders?: string;
    selectCardsPerPage?: string;
  };
  loadingElementV2?: string;
  loadingElementCss?: string;
  btnSectionXpath?: string;
  btnSectionCss?: string;
}

/**
 * @description Shop Site Informations object definition
 * @export
 * @class SiteInfo
 */
export class SiteInfo {
  host?: string;
  sessionId?: string;
  source?: string;
}

/**
 * @description Parameters used for set the phone properties on the constructor
 * @export
 * @class PHoneCollectionConfig
 */
export class PhoneCollectionConfig {
  source: string;
  user: string;
  sessionId: string;
  loggerService: LoggerService;
  parsers: Parsers;
  seleniumService: SeleniumService;
  redisService: RedisService;
  searchCriterias: any;
  // sessionInfo: SessionInfoConfig;
  pubsubService: PubsubService;
  globalService: GlobalService;
  requestService: RequestService;
  filters?: any[];
  credType: string;
  takeScreenshot?: boolean;
  isCollection: boolean;
  elasticService: ElasticService;
}

/**
 * @description Parameters used for set the default object properties on the constructor
 * @export
 * @class DefaultCollectionConfig
 */
export class DefaultCollectionConfig {
  source: string;
  user: string;
  // sessionId: string;
  loggerService: LoggerService;
  parsers: Parsers;
  seleniumService: SeleniumService;
  redisService: RedisService;
  searchCriterias: any;
  sessionInfo: SessionInfoConfig;
  pubsubService: PubsubService;
  globalService: GlobalService;
  requestService: RequestService;
  // filters?: any[];
  // credType: string;
  takeScreenshot?: boolean;
  isCollection: boolean;
  elasticService: ElasticService;
}
