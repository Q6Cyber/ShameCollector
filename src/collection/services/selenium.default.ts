/* eslint-disable no-useless-catch */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint @typescript-eslint/no-var-requires: "off" */
import { DefaultCollectionService } from './default.collection.service';
import { DefaultCollectionConfig } from '../models/shop.model';
import { ProcessResult } from '../../common/enums';
import * as cheerio from 'cheerio';
import sleep from 'await-sleep';

export class SeleniumDefault extends DefaultCollectionService {
  protected textValidationCountry = [
    'United States of America',
    'United States',
    'USA',
    'US',
  ];

  constructor(params: DefaultCollectionConfig) {
    super(params);
  }

  protected async goTo(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::goTo`;
    try {
      this.morePages = true;
      this.currentSearch = this.currentURL;

      await this.getUrlHandler(this.currentSearch);
      // await this.savePaginate();
    } catch (error) {
      await this.loggerService.error(`${loggerHeader}::Error on go to`, error);
      throw error;
    }
    return true;
  }

  protected async closeModalConsent() {
    const loggerHeader = `${this.LOG_MESSAGE}::closeModalConsent`;
    try {
      const modal = await this.seleniumService.driver.findElement(
        this.seleniumService.By.xpath(this.selectors.modalElement),
      );
      if (modal) {
        await this.clickElement(modal);
        await this.awaitingTime();
      }
    } catch (error) {
      await this.loggerService.info(
        `${loggerHeader}::No modal to close`,
        error,
      );
    }
    return true;
  }

  protected async getRawData() {
    const loggerHeader = `${this.LOG_MESSAGE}::getRawData`;
    try {
      const pageSource = await this.getSourceText();
      const $ = cheerio.load(pageSource);
      //Choose the pathData according to the section.
      const posts = this.currentSearchUrl.pathData
        ? $(this.currentSearchUrl.pathData)
        : $(this.selectors.pathData);
      const postsList: any = [];
      posts &&
        posts.each(function () {
          postsList.push($(this));
        });

      this.parsedRawPosts = [];
      this.rawPosts = postsList;
      if (this.rawPosts.length === 0) {
        this.shopStatus = ProcessResult.END_OF_STORE;
        this.morePages = false;
        return true;
      }
      return true;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error on getRawData`,
        error,
      );
      throw error;
    }
  }

  protected async isValidPage(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::isValidPage`;
    let result = false;
    try {
      if (this.selectors.isValidElement) {
        await this.seleniumService.driver.findElement(
          this.seleniumService.By.xpath(this.selectors.isValidElement),
        );
      }
      result = true;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error validation page data`,
        error,
      );
    }
    return result;
  }

  protected async getNextPageElement(): Promise<string> {
    const loggerHeader = `${this.LOG_MESSAGE}::getNextPage`;
    let result = '';
    try {
      result = `${this.currentSearchUrl.pagePath}${this.currentPage + 1}]`;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::error getting next page`,
        error,
      );
      throw error;
    }
    return result;
  }

  protected async checkPaginationElement(element: string): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::checkPaginationElement`;
    let result = true;
    try {
      await this.seleniumService.driver.findElement(
        this.seleniumService.By.xpath(element),
      );
    } catch (error) {
      await this.loggerService.info(
        `${loggerHeader}::Error checking pagination element`,
      );
      this.morePages = false;
      this.shopStatus = ProcessResult.END_OF_STORE;
      result = false;
    }
    return result;
  }

  protected async getNextPaginationUrl(): Promise<string> {
    const loggerHeader = `${this.LOG_MESSAGE}::getNextPaginationUrl`;
    let result = '';
    try {
      result = `${this.sessionInfo.connectionInfo.url}${
        this.currentSearchUrl.url
      }${this.selectors.urlParam}${this.currentPage + 1}${
        this.selectors.urlTail
      }`;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error getting next pagination url`,
        error,
      );
      throw error;
    }
    return result;
  }
  protected async cloudflareVisible(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::cloudflareVisible`;
    let result = false;
    try {
      const currentUrl = await this.seleniumService.driver.getCurrentUrl();

      const isCloudflareVisible = await this.seleniumService.driver
        .executeScript(`
        return document.querySelector('body div[class="main-wrapper"]') !== null;
      `);
      if (isCloudflareVisible) {
        result = true;
        await this.seleniumService.driver.executeScript(
          `window.location.assign("${currentUrl}");`,
        );
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error refreshing cloudflare`,
        error,
      );
      throw error;
    }
    return result;
  }

  protected async validPageHandler(): Promise<boolean> {
    let tries = 0;
    while (tries < 3) {
      const result = await this.isValidPage();
      if (!result) {
        const isCloudFlareVisible = await this.cloudflareVisible();
        if (!isCloudFlareVisible) {
          await this.refreshPage();
        }
        await this.awaitingTime();
      }
      await this.closeModalConsent();
      if (result) {
        break;
      } else {
        tries++;
        if (tries > 2) {
          throw new Error('no valid page');
        }
      }
    }
    return true;
  }

  protected async getUrlHandler(data, isClickAction = false): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::getUrlHandler`;
    try {
      let tries = 0;
      while (tries < 3) {
        try {
          if (isClickAction) {
            try {
              const nextPage = await this.seleniumService.driver.findElement(
                this.seleniumService.By.xpath(data),
              );
              await this.clickElement(nextPage);
            } catch (error) {
              throw error;
            }
          } else {
            await this.seleniumService.driver.get(data);
          }
          // await this.awaitingTime();
          // await this.validPageHandler();
          break;
        } catch (error) {
          await sleep(5000);
          tries++;
          if (tries > 2) {
            throw error;
          }
        }
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error on Url Handler`,
        error,
      );
      throw error;
    }
    return true;
  }

  protected async paginate() {
    const loggerHeader = `${this.LOG_MESSAGE}::paginate`;
    try {
      const nextPage = await this.getNextPageElement();
      const result = await this.checkPaginationElement(nextPage);
      if (result) {
        await this.loggerService.info(
          `${loggerHeader}: Finding Page #${this.currentPage + 1}`,
        );
        const url = await this.getNextPaginationUrl();
        const dataHandler = this.isClickAction ? nextPage : url;
        await this.getUrlHandler(dataHandler, this.isClickAction);
        this.currentURL = url;
        this.currentPage++;
        await this.savePaginate();
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error making pagination`,
        error,
      );
      throw error;
    }
    return true;
  }

  protected async clickElement(element): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::clickElement`;
    try {
      if (this.seleniumService.driverType === 'Chrome') {
        await this.seleniumService.driver.executeScript(
          'arguments[0].click();',
          element,
        );
      } else {
        await element.click();
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error on clickElement`,
        error,
      );
      throw error;
    }
  }

  protected async getCountry(cheerioElement): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::getCountry`;
    let country = '';
    try {
      country = cheerioElement(this.selectors.countryPath).text().trim();
      country = country.replace(/Phone Number|\d+/g, '').trim();
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error getting country`,
        error,
      );
      throw error;
    }
    return country;
  }

  protected async getPhoneNumber(cheerioElement): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::getPhoneNumber`;
    let phone = '';
    try {
      const phonePath = this.currentSearchUrl.phonePath
        ? cheerioElement(this.currentSearchUrl.phonePath)
        : cheerioElement(this.selectors.phonePath);
      phone = cheerioElement(phonePath).text().trim();
      phone = phone.replace(/(?<=\d) (?=\d)/g, '');
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error getting phone number`,
        error,
      );
      throw error;
    }
    return phone;
  }
}
