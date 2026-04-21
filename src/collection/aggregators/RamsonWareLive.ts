/* eslint @typescript-eslint/no-var-requires: "off" */
import * as cheerio from 'cheerio';
import sleep from 'await-sleep';
import { DefaultCollectionConfig } from '../models/shop.model';
import { SeleniumDefault } from '../services/selenium.default';

export class RamsonWareLive extends SeleniumDefault {
  constructor(params: DefaultCollectionConfig) {
    super(params);
    this.waitUntilElement = 10000;
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
    const activeGroups: { name: string; link: string }[] = [];

    try {
      this.loggerService.info(
        `${loggerHeader}:: Loading HTML into Cheerio for parsing`,
      );
      // Load the raw HTML into Cheerio
      const $ = cheerio.load(pageSource);

      // Find all group list items
      const groupElements = $(this.selectors.groupItem);

      // Iterate through each group element
      groupElements.each((index, element) => {
        const statusText = $(element).find(this.selectors.status).text().trim();

        const groupLink = $(element).find('a').first().attr('href');

        if (!statusText.includes('Offline') && groupLink) {
          const groupName = $(element)
            .find(this.selectors.groupName)
            .text()
            .trim();

          // Push the valid group in the array
          activeGroups.push({
            name: groupName,
            link: groupLink,
          });
        }
      });
      this.loggerService.info(
        `${loggerHeader}:: Found ${activeGroups.length} ACTIVE groups out of ${groupElements.length} total groups.`,
      );
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}:: Error extracting active groups`,
        error,
      );
    }
    return activeGroups;
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

  protected extractAndDeduplicateUrls(pageSource: string): string[] {
    const loggerHeader = `${this.LOG_MESSAGE}::extractAndDeduplicateUrls`;
    const extractedUrls: string[] = [];

    try {
      this.loggerService.info(
        `${loggerHeader}:: Parsing locations table with Cheerio`,
      );

      // Load the updated HTML into Cheerio
      const $ = cheerio.load(pageSource);

      // Target the rows inside the Known Locations table
      const tableRows = $(this.selectors.pathData);

      // Iterate through each row
      tableRows.each((index, element) => {
        // The "Available" column is the 4th
        const availableText = $(element).find('td').eq(3).text().trim();

        if (availableText === 'Yes') {
          // The "FQDN" (URL) column is the 7th
          const url = $(element).find('td').eq(6).text().trim();

          if (url) {
            extractedUrls.push(url);
          }
        }
      });

      // Deduplicate the URLs using a JavaScript Set
      const uniqueUrls = [...new Set(extractedUrls)];

      this.loggerService.info(
        `${loggerHeader}:: Extracted ${uniqueUrls.length} unique active URLs (from ${extractedUrls.length} total active found).`,
      );

      return uniqueUrls;
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}:: Error extracting URLs from table`,
        error,
      );
      return [];
    }
  }

  protected createRansomwareGroupRecord(sourceName: string, urls: string[]) {
    const loggerHeader = `${this.LOG_MESSAGE}::createRansomwareGroupRecord`;

    this.loggerService.info(
      `${loggerHeader}:: Formatting payload for ${sourceName} with ${urls.length} URLs`,
    );

    // Map each unique URL to the exact OpenSearch tracking schema
    const formattedUrlList = urls.map((url) => ({
      url: url,
      isActive: true,
      isValid: true,
      settings: {
        exactHostMatch: false,
        wildcardPath: false,
        wildcardParams: false,
      },
      lastPasswordLogin: null,
      lastCheck: null,
      lastCookieLogin: null,
      connType: '',
      driverType: '',
      lastLoginType: '',
      status: '',
    }));

    // Wrap and return the complete group object
    return {
      type: 'RANSOMWARE_GROUP',
      state: 'ACTIVE',
      sourceName: sourceName,
      urlList: formattedUrlList,
    };
  }

  protected async searchProcess(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::searchProcess`;
    const results: any[] = [];

    try {
      this.loggerService.info(`${loggerHeader}:: Starting extraction`);

      // Get initial page and filter active groups
      const initialHtml = await this.getSourceText();
      const activeGroups = await this.getActiveGroups(initialHtml);

      // Iterate through each active group
      for (const group of activeGroups) {
        // Navigate and open the table
        await this.openGroupLocations(group);

        // Get updated HTML and extract URLs
        const updatedHtml = await this.getSourceText();
        const cleanUrls = this.extractAndDeduplicateUrls(updatedHtml);

        // Build the final JSON object
        if (cleanUrls.length > 0) {
          const groupPayload = this.createRansomwareGroupRecord(group.name, cleanUrls);
          results.push(groupPayload);
        }
      }

      // Save to class property so processShop() can return it
      this.parsedRawPosts = results;
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
