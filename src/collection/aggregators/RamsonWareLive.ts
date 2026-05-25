/* eslint @typescript-eslint/no-var-requires: "off" */
import * as cheerio from 'cheerio';
import sleep from 'await-sleep';
import { DefaultCollectionConfig } from '../models/shop.model';
import { SeleniumDefault } from '../services/selenium.default';
import { RansomwareGroup } from '../models/RansomwareGroup';

export class RamsonWareLive extends SeleniumDefault {
  constructor(params: DefaultCollectionConfig) {
    super(params);
    this.waitUntilElement = 6000;
    this.LOG_MESSAGE = 'RamsonWareLive';

    this.searchUrls = [{ url: '/groups', pagePath: '' }];

    this.selectors = {
      loadingElement: '',
      groupItem: 'li.rl-group-item',
      groupName: '.rl-group-badge',
      status: '.flex-shrink-0 .badge',
      pathData: `div#locations-section > table > tbody > tr`,
    };

    this.shopRecipe = ['goTo', 'awaitingTime', 'searchProcess'];
  }

  protected async getActiveGroups(pageSource: string) {
    const loggerHeader = `${this.LOG_MESSAGE}::getActiveGroups`;

    const scrapedGroups: { name: string; link: string; isOnline: boolean }[] =
      [];

    try {
      this.loggerService.info(
        `${loggerHeader}:: Loading HTML into Cheerio for parsing`,
      );
      const $ = cheerio.load(pageSource);

      const groupElements = $(this.selectors.groupItem);

      groupElements.each((index, element) => {
        const statusText = $(element).find(this.selectors.status).text().trim();
        const isOnline = statusText === 'Online';

        const groupLink = $(element).find('a').first().attr('href');

        if (groupLink) {
          const groupName = $(element)
            .find(this.selectors.groupName)
            .text()
            .trim();

          scrapedGroups.push({
            name: groupName,
            link: groupLink,
            isOnline: isOnline,
          });
        }
      });
      this.loggerService.info(
        `${loggerHeader}:: Found ${scrapedGroups.length} total groups (Online and Offline) out of ${groupElements.length} elements.`,
      );
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}:: Error extracting groups`,
        error,
      );
    }
    return scrapedGroups;
  }

  protected async openGroupLocations(group: { name: string; link: string }) {
    const loggerHeader = `${this.LOG_MESSAGE}::openGroupLocations`;

    try {
      this.loggerService.info(
        `${loggerHeader}:: Navigating to group page: ${group.name}`,
      );

      // Build the full URL and navigate directly
      const fullUrl = `https://www.ransomware.live${group.link}`;
      await this.seleniumService.driver.get(fullUrl);

      await this.awaitingTime();

      this.loggerService.info(
        `${loggerHeader}:: Clicking 'Known Locations' toggle for ${group.name}`,
      );
      const locationsToggle = await this.seleniumService.driver.findElement(
        this.seleniumService.By.css('a#toggle-locations'),
      );

      await this.clickElement(locationsToggle);

      await sleep(3000);
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}:: Error expanding locations for ${group.name}`,
        error,
      );
    }
  }

  protected extractAndDeduplicateUrls(
    pageSource: string,
  ): { url: string; isUrlOnline: boolean }[] {
    const loggerHeader = `${this.LOG_MESSAGE}::extractAndDeduplicateUrls`;
    const extractedUrls: { url: string; isUrlOnline: boolean }[] = [];
    const $ = cheerio.load(pageSource);

    $('table tbody tr').each((index, element) => {
      const rowHtml = $(element).html()?.toLowerCase() || '';
      const rowText = $(element).text().toLowerCase();

      let urlText = '';
      $(element)
        .find('td')
        .each((i, col) => {
          const colText = $(col).text().trim();
          if (colText.includes('.') && !colText.includes(' ')) {
            urlText = colText;
          }
        });

      if (urlText) {
        const isUrlOnline =
          rowText.includes('online') || rowHtml.includes('badge-success');

        extractedUrls.push({
          url: urlText,
          isUrlOnline: isUrlOnline,
        });
      }
    });

    const uniqueUrls = extractedUrls.filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.url === value.url),
    );

    return uniqueUrls;
  }

  protected createRansomwareGroupRecord(
    sourceName: string,
    urls: { url: string; isUrlOnline: boolean }[],
    isGroupOnline: boolean,
  ): RansomwareGroup {
    const loggerHeader = `${this.LOG_MESSAGE}::createRansomwareGroupRecord`;

    this.loggerService.info(
      `${loggerHeader}:: Formatting payload for ${sourceName} with ${urls.length} URLs`,
    );

    // Map each unique URL to the exact OpenSearch tracking schema
    const formattedUrlList = urls.map((urlObj) => {
      const rawUrl = urlObj.url;
      const isUrlOnline = urlObj.isUrlOnline || isGroupOnline;
      const isOnion = rawUrl.endsWith('.onion');
      return {
        url: isOnion ? `http://${rawUrl}` : `https://${rawUrl}`,
        isActive: isUrlOnline,
        isValid: true,
        status: isUrlOnline ? 'AVAILABLE' : 'UNAVAILABLE',
        settings: {
          exactHostMatch: false,
          wildcardPath: false,
          wildcardParams: false,
        },
        lastPasswordLogin: null,
        lastCheck: null,
        lastCookieLogin: null,
        connType: isOnion ? 'TOR_SOCKS' : 'PROXY',
        driverType: 'Chrome',
        lastLoginType: '',
      };
    });

    return {
      type: 'RANSOMWARE_GROUP',
      state: isGroupOnline ? 'ACTIVE' : 'INACTIVE',
      sourceName: sourceName,
      urlList: formattedUrlList,
    };
  }

  protected async publishSourcesToElastic() {
    const loggerHeader = `${this.LOG_MESSAGE}::publishSourcesToElastic`;

    this.loggerService.info(
      `${loggerHeader}:: Processing all ${this.parsedRawPosts.length} groups`,
    );

    for (const rawGroup of this.parsedRawPosts) {
      const group = rawGroup as RansomwareGroup;
      try {
        const env = process.env.ENVIRONMENT === 'production' ? 'PROD' : 'DEV';
        const coverNameKey = `RANSOMWARE_GROUP:${env}:${group.sourceName}`;

        let coverNameObj =
          await this.redisService.getCoverNameWASP(coverNameKey);

        if (!coverNameObj) {
          const waspParams = {
            type: 'RANSOMWARE_GROUP',
            source: group.sourceName,
            create_source: true,
            parent_source: group.sourceName,
            create_missing_source: false,
          };

          const response = await this.requestService.request(
            'GET',
            `${process.env.WASP}/covername/getCoverName`,
            null,
            waspParams,
          );

          if (response.statusCode === 200 && response.data) {
            coverNameObj = JSON.parse(response.data);

            await this.redisService.setCoverNameWASP(
              coverNameObj,
              coverNameKey,
            );
          } else {
            throw new Error(
              `Failed to get cover name from WASP for ${group.sourceName}`,
            );
          }
        }

        group.coverName = coverNameObj.cover_name;

        const updateScript = `
          ctx._source.state = params.state;
          
          if (ctx._source.reaperSettings != null) {
            ctx._source.reaperSettings.active = params.isOnline;
          } else {
            ctx._source.reaperSettings = ['active': params.isOnline];
          }
          
          if (params.urlList != null) {
            ctx._source.urlList = params.urlList;
          }
        `;

        const updateResponse = await this.elasticService.client!.updateByQuery({
          index: process.env.ES_SOURCES || 'sources',
          refresh: true,
          conflicts: 'proceed',
          body: {
            query: {
              ids: { values: [group.coverName] },
            },
            script: {
              source: updateScript,
              params: {
                state: group.state,
                isOnline: group.isOnline,
                urlList: group.urlList,
              },
            },
          },
        });

        if (updateResponse.body.updated === 0) {
          this.loggerService.info(
            `${loggerHeader}:: Group ${group.sourceName} not found in DB. Creating as new...`,
          );

          await this.elasticService.client!.index({
            index: process.env.ES_SOURCES || 'sources',
            id: group.coverName as string,
            refresh: true,
            body: {
              type: 'RANSOMWARE_GROUP',
              sourceName: group.sourceName,
              state: group.state,
              isSubsource: false,
              urlList: group.urlList,
              reaperSettings: { active: group.isOnline },
            },
          });

          this.loggerService.info(
            `${loggerHeader}:: Successfully created new group ${group.sourceName}`,
          );
        } else {
          this.loggerService.info(
            `${loggerHeader}:: Successfully updated existing group ${group.sourceName} via updateByQuery`,
          );
        }
      } catch (error) {
        this.loggerService.error(
          `${loggerHeader}:: Error processing group ${group.sourceName}`,
          error,
        );
      }
    }

    this.loggerService.info(
      `${loggerHeader}:: Finished OpenSearch updates for all groups!`,
    );
  }

  protected async searchProcess(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::searchProcess`;
    const results: RansomwareGroup[] = [];

    try {
      this.loggerService.info(`${loggerHeader}:: Starting extraction`);

      const initialHtml = await this.getSourceText();
      const scrapedGroups = await this.getActiveGroups(initialHtml);

      for (const group of scrapedGroups) {
        await this.openGroupLocations(group);
        const updatedHtml = await this.getSourceText();
        const cleanUrls = this.extractAndDeduplicateUrls(updatedHtml);

        const groupPayload = this.createRansomwareGroupRecord(
          group.name,
          cleanUrls,
          group.isOnline,
        );

        results.push({
          ...groupPayload,
          isOnline: group.isOnline,
        });
      }

      this.parsedRawPosts = results;

      await this.publishSourcesToElastic();
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}:: Error during search process`,
        error,
      );
    }
    return true;
  }

  protected async processShop(): Promise<any> {
    const result = await super.processShop();
    return {
      ...result,
      data: this.parsedRawPosts,
    };
  }
}
