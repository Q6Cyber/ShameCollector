/*eslint camelcase: ["error", {properties: "never"}]*/
import { GrayLogHandler } from './graylog.service';
import { Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { PubsubService } from './pubsub.service';
import { GlobalService } from './global.service';
import { LoggerService } from './logger.service';
import { MetricsService } from './metrics.service';
import { RedisService } from './redis.service';
import * as util from 'util';
import lodash from 'lodash';

// eslint-disable-next-line @typescript-eslint/no-var-requires
import moment from 'moment';

// SS: the computation of a "node" is a static endevour required for connecting to Elastic.
// Because of there static nature I created them up here vs inside the class.

// There are 2 ways of authentication: user/pass and token.

enum Mode {
  USERPASS = 'userpass',
  TOKEN = 'token',
}

@Injectable()
export class ElasticService {
  protected logHeader: string;
  public client: Client | null = null; // Elastic Client not one of our clients.
  private isConnectionSafe = true;
  private testErrorMsg = '';
  private readonly errorsToMatch = [
    {
      reg: /Authentication finally failed/,
      msg: 'Invalid token - Authentication finally failed',
    },
    {
      reg: /EADDRNOTAVAIL/,
      msg: 'Address not available - EADDRNOTAVAIL',
    },
  ];

  constructor(
    protected graylog: GrayLogHandler,
    protected globalService: GlobalService,
    protected loggerService: LoggerService,
    protected pubsubService: PubsubService,
    protected redisService: RedisService,
    protected metricsService: MetricsService,
  ) {
    this.logHeader = 'ElasticService';
    this.initClient();
  }

  public mode(): Mode {
    let y: Mode;

    if (
      process.env.JSON_TOKEN_FILE &&
      !process.env.ES_USER &&
      !process.env.ES_PASS
    ) {
      y = Mode.TOKEN;
    } else if (
      !process.env.JSON_TOKEN_FILE &&
      process.env.ES_USER &&
      process.env.ES_PASS
    ) {
      y = Mode.USERPASS;
    } else {
      throw new Error(
        'Invalid combination of ENV Variables: JSON_TOKEN_FILE, ES_USER/ES_PASS. Only one of the two methods is allowd.',
      );
    }
    return y;
  }

  public async initClient() {
    try {
      const urlString = `${process.env.ES_PROTO}://${process.env.ES_HOST}:${process.env.ES_PORT}`;
      const url: URL = new URL(urlString);

      let node: any = null;
      if (this.mode() === Mode.USERPASS) {
        url.username = encodeURIComponent(process.env.ES_USER || 'ES_USER');
        url.password = encodeURIComponent(process.env.ES_PASS || 'ES_PASS');
        node = {
          url: url,
          ssl: {
            rejectUnauthorized: false,
          },
        };
      }

      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      this.client = new Client({ node });
    } catch (e) {
      this.loggerService.error(
        `${this.logHeader}::initClient::Error getting new elastic client`,
        { error: util.inspect(e) },
      );
      throw e;
    }
  }

  async testElasticConnection() {
    let response;
    let result;
    try {
      if (!this.client) {
        return false;
      }
      response = await this.client.search({
        index: process.env.ES_SOURCES,
        size: 1,
        body: {
          query: {
            match_all: {},
          },
        },
      });
      result = (response.body.hits?.hits?.length || 0) > 0 ? true : false;
    } catch (e) {
      const errorMsg = util.inspect(e);
      this.testErrorMsg = '';
      for (const matchCheck of this.errorsToMatch) {
        if (errorMsg.match(matchCheck.reg)) {
          this.testErrorMsg = matchCheck.msg;
          break;
        }
      }
      if (this.testErrorMsg.length === 0) {
        this.testErrorMsg = 'Unhandled error please check log file';
      }

      this.loggerService.error(
        `testElasticConnection::Error testing connection`,
        { error: errorMsg },
      );
      result = false;
    }

    return result;
  }

  async testCertificate() {
    let result = true;
    try {
      await this.testElastic();
    } catch (e) {
      result = false;
      this.loggerService.error(
        `${this.logHeader}::testCertificate::Error testing ES certificate`,
        { error: util.inspect(e) },
      );
    }
    return result;
  }

  public async testElastic() {
    let triesCount = 3;
    try {
      while (triesCount > 0) {
        if (!(await this.testElasticConnection())) {
          await this.initClient();
        } else {
          this.isConnectionSafe = true;
          break;
        }
        triesCount--;
      }

      if (triesCount < 1) {
        if (this.testErrorMsg.length === 0) {
          this.testErrorMsg = 'Unhandled error please check log file';
        }
        this.isConnectionSafe = false;
        // await this.pubsubService.sendSlackNotification(
        //   'NotificationsAPI',
        //   this.testErrorMsg,
        //   ['sakura'],
        // );
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw this.testErrorMsg;
      }
    } catch (e) {
      this.loggerService.error(
        `${this.logHeader}::testElastic::Error testing ES connection`,
        { error: util.inspect(e) },
      );
      throw e;
    }
  }

  getIsConnectionSafe() {
    return this.isConnectionSafe;
  }

  public async delete(index, id) {
    const request = { index, id };
    let result;
    await this.testElastic();
    try {
      if (!this.client) {
        return false;
      }
      await this.client.delete(request);
      result = true;
    } catch (e) {
      result = false;
      console.error(e); // silent
    }

    return result;
  }

  public async create(index: string, doc: any) {
    const request: any = {
      index,
      // refresh: 'wait_for',
      id: doc.id,
      body: doc,
    };
    let result;
    await this.testElastic();
    try {
      if (!this.client) {
        return false;
      }
      await this.client.create(request);
      result = true;
    } catch (e) {
      result = false;
      console.error(e); // silent
    }

    return result;
  }

  public async search(body) {
    const results: any[] = [];
    await this.testElastic();
    if (!this.client) {
      return results;
    }
    const response: any = await this.client.search(body);
    // format hits into an array of _sources
    const hits = response.body.hits.hits;
    hits.forEach((element: any) => {
      results.push(element._source);
    });

    return results;
  }

  public async searchAggs(body) {
    await this.testElastic();
    // format hits into an array of _sources
    if (!this.client) {
      return null;
    }
    const response: any = await this.client.search(body);
    return response.body.aggregations;
  }

  async updateUsingBulk(bodyUpdate, returnProcessResult = false): Promise<any> {
    await this.testElastic();
    try {
      if (!this.client) {
        return false;
      }
      const result = await this.client.bulk({ body: bodyUpdate });
      if (returnProcessResult) {
        return result;
      }
    } catch (error) {
      this.loggerService.error(
        `${this.logHeader}::updateUsingBulk::Error updating records using bulk process`,
        error,
      );
    }
    return true;
  }

  // Get active shops
  async queryActiveShops() {
    await this.testElastic();
    if (!this.client) {
      return [];
    }
    let query: any = await this.client.search({
      index: process.env.ES_SOURCES,
      size: 100,
      _source: ['id', 'sourceName', 'reaperSettings', 'credentials'],
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  type: {
                    value: 'SHOP',
                  },
                },
              },
              {
                term: {
                  'state.keyword': {
                    value: 'ACTIVE',
                  },
                },
              },
              {
                match: {
                  'reaperSettings.active': true,
                },
              },
            ],
          },
        },
      },
    });

    if (['test'].includes(process.env.ENVIRONMENT || 'test')) {
      query = query.filter((x) => /^Sakura/.test(x.id));
    }

    return query;
  }

  async getUsersAndStateByShop(sourceName) {
    await this.testElastic();
    if (!this.client) {
      return null;
    }
    const query: any = await this.client.search({
      index: process.env.ES_SOURCES || 'sources-dev',
      size: 100,
      _source: ['id', 'sourceName', 'credentials', 'reaperSettings', 'urlList'],
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  type: {
                    value: 'SHOP',
                  },
                },
              },
              {
                term: {
                  sourceName: {
                    value: sourceName,
                  },
                },
              },
              {
                term: {
                  isSubsource: false,
                },
              },
            ],
          },
        },
      },
    });
    return query;
  }

  async checkActiveTarget(targetName: string) {
    await this.testElastic();
    if (!this.client) {
      return null;
    }
    const esResponse = await this.client.search({
      index: process.env.ES_SOURCES || 'sources-dev',
      size: 1,
      _source: ['reaperSettings'],
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  sourceName: targetName,
                },
              },
              {
                term: {
                  type: 'SHOP',
                },
              },
              {
                term: {
                  'reaperSettings.active': true,
                },
              },
            ],
          },
        },
      },
    });
    const target = lodash.get(
      esResponse,
      ['body', 'hits', 'hits', '0', '_source'],
      null,
    );
    let result = true;
    if (!target) {
      result = false;
    }
    return result;
  }

  async getIndexCred(source: string, username: string) {
    await this.testElastic();
    if (!this.client) {
      return null;
    }
    const esResponse = await this.client.search({
      index: process.env.ES_SOURCES || 'sources-dev',
      size: 1,
      _source: ['credentials'],
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  sourceName: source,
                },
              },
              {
                term: {
                  type: 'FORUM',
                },
              },
              {
                exists: {
                  field: 'reaperSettings',
                },
              },
            ],
          },
        },
      },
    });
    const target = lodash.get(
      esResponse,
      ['body', 'hits', 'hits', '0', '_source'],
      null,
    );
    const credentials = target.credentials;
    const credIdx = credentials.findIndex((credential) => {
      return credential.username === username;
    });
    return {
      idx: credIdx,
    };
  }

  async updateUserToInactive(
    sourceName: string,
    username: string,
  ): Promise<any> {
    let result = true;
    await this.testElastic();
    try {
      if (!this.client) {
        return null;
      }
      const creds: any = await this.getIndexCred(sourceName, username);
      return await this.client.updateByQuery({
        index: process.env.ES_SOURCES || 'sources-dev',
        refresh: true,
        body: {
          query: {
            bool: {
              must: [
                {
                  term: {
                    sourceName,
                  },
                },
                {
                  term: {
                    type: 'FORUM',
                  },
                },
                {
                  exists: {
                    field: 'reaperSettings',
                  },
                },
              ],
            },
          },
          script: {
            source: 'ctx._source.credentials[params.idx].disabled = true',
            params: {
              idx: creds.idx,
            },
          },
        },
      });
    } catch (error) {
      this.loggerService.error(
        `updateUserToInactive::Error updating user to inactive`,
        { error: util.inspect(error) },
      );
      result = false;
    }
    return result;
  }

  async updateCredentialsForInactiveUser(sourceName, script) {
    if (script.length === 0) return true;
    await this.testElastic();
    if (!this.client) {
      return null;
    }
    //Enable and disable users
    await this.client.updateByQuery({
      index: process.env.ES_SOURCES || 'sources-dev',
      refresh: true,
      conflicts: 'proceed',
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  sourceName: `${sourceName}`,
                },
              },
              {
                exists: {
                  field: 'reaperSettings',
                },
              },
            ],
          },
        },
        script: {
          source: `
          ${script}
            `,
        },
      },
    });
    return true;
  }

  async getUserListByShop(sourceName: string) {
    const result: any = [];
    try {
      // get users and state by shop
      const usersAndStateByShop = await this.getUsersAndStateByShop(sourceName);
      const shop = usersAndStateByShop.body.hits.hits[0];

      //credentials
      const credentials = lodash.get(shop, ['_source', 'credentials'], null);
      if (credentials != null) {
        for (const credential of credentials) {
          if (
            !(
              credential.credType === 'MANUAL' ||
              credential.credType === 'PURCHASE'
            )
          ) {
            result.push({
              index: credentials.indexOf(credential),
              username: credential.username,
              credType: credential.credType,
              disabled: credential.disabled,
            });
          }
        }
      }
    } catch (error) {
      this.loggerService.error(`Error getting user list by Shop. `, error);
    }
    //return a list of users with regular and enhanced type
    return result;
  }

  async getBulkPostsById(postsId) {
    try {
      await this.testElastic();
      if (!this.client) {
        return null;
      }
      const response = await this.client.search({
        index: process.env.ES_TA_DIRECT,
        _source: ['_id'],
        size: postsId.length,
        body: {
          query: {
            terms: { _id: postsId },
          },
        },
      });
      return response;
    } catch (error) {
      this.loggerService.error(`Error getting bulk posts by ID`, error);
      throw error;
    }
  }

  async updateUserShopToActive(sourceName: string, username: string) {
    try {
      const userList = await this.getUserListByShop(sourceName);
      const user = userList.find((x) => x.username === username);
      if (user) {
        const script = `ctx._source.credentials[${user.index}].disabled = false;`;
        await this.updateCredentialsForInactiveUser(sourceName, script);
      }
    } catch (error) {
      this.loggerService.error(`Error updating user to active`, error);
    }
    return true;
  }
}
