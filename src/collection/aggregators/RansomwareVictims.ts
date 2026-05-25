import { createHash } from 'crypto';
import sleep from 'await-sleep';
import * as cheerio from 'cheerio';
import { DefaultCollectionConfig } from '../models/shop.model';
import { SeleniumDefault } from '../services/selenium.default';
import { RansomwareRecipes } from '../common/ransomwareRecipes';
import { RansomwareGroup } from '../models/RansomwareGroup';
import { DynamicClickStrategy } from './strategies/DynamicClickStrategy';
import { StaticHtmlStrategy } from './strategies/StaticHtmlStrategy';

export class RansomwareVictims extends SeleniumDefault {
  constructor(params: DefaultCollectionConfig) {
    super(params);
    this.LOG_MESSAGE = 'RansomwareVictims';
    this.waitUntilElement = 10000;
    this.shopRecipe.push('searchProcess');
  }

  protected async searchProcess(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::searchProcess`;

    try {
      this.loggerService.info(
        `${loggerHeader}:: Fetching active ransomware groups from OpenSearch...`,
      );

      const allActiveGroups =
        await this.elasticService.queryActiveRansomwareGroups();

      const activeGroups: RansomwareGroup[] = allActiveGroups
        .filter((group: any) =>
          group.urlList?.some(
            (u: any) => u.status === 'AVAILABLE' && u.isActive === true,
          ),
        )
        .slice(0, 10); // TODO: Remove slice

      this.loggerService.info(
        `${loggerHeader}:: Found ${activeGroups.length} active groups to process.`,
      );

      for (const group of activeGroups) {
        try {
          const targetUrlObj = group.urlList?.find(
            (u: any) => u.status === 'AVAILABLE' && u.isActive === true,
          );

          if (!targetUrlObj) {
            this.loggerService.info(
              `${loggerHeader}:: No AVAILABLE URL found for group ${group.sourceName}. Skipping...`,
            );
            continue;
          }

          const targetUrl = targetUrlObj.url;
          this.loggerService.info(
            `${loggerHeader}:: Navigating to ${group.sourceName} at ${targetUrl}...`,
          );

          await this.seleniumService.driver.get(targetUrl);

          await sleep(5000);

          await this.awaitingTime();

          const passwordInputs = await this.seleniumService.driver.findElements(
            this.seleniumService.By.css('input[type="password"]'),
          );

          if (passwordInputs.length > 0) {
            this.loggerService.info(
              `${loggerHeader}:: REQUIRES_CREDENTIALS - Site ${group.sourceName} is behind a login screen.`,
            );
            continue;
          }

          const recipe: any =
            RansomwareRecipes[
              group.sourceName as keyof typeof RansomwareRecipes
            ];

          const strategy =
            recipe && recipe.clickSelector
              ? new DynamicClickStrategy()
              : new StaticHtmlStrategy();

          this.loggerService.info(
            `${loggerHeader}:: Extracting data for ${group.sourceName} using ${strategy.constructor.name}...`,
          );

          await strategy.extractData(
            group,
            this.seleniumService.driver,
            targetUrl,
            async (g, html, url) => {
              await this.universalParser(g, html, url);
            },
            recipe,
          );
        } catch (groupError) {
          this.loggerService.error(
            `${loggerHeader}:: Error processing group ${group.sourceName}`,
            groupError,
          );
        }
      }
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}:: Error in main search process`,
        error,
      );
      throw error;
    }
    return true;
  }

  private async handleCaptcha(sourceName: string) {
    const loggerHeader = `${this.LOG_MESSAGE}::handleCaptcha`;
    // TODO: Implement DeathByCaptcha logic here
  }

  private async universalParser(
    group: RansomwareGroup,
    pageSource: string,
    targetUrl: string,
  ) {
    const loggerHeader = `${this.LOG_MESSAGE}::universalParser`;
    const $ = cheerio.load(pageSource);

    const env = process.env.ENVIRONMENT === 'production' ? 'PROD' : 'DEV';
    const coverNameKey = `RANSOMWARE_GROUP:${env}:${group.sourceName}`;
    const cachedCoverNameObj =
      await this.redisService.getCoverNameWASP(coverNameKey);
    const coverName = cachedCoverNameObj
      ? cachedCoverNameObj.cover_name
      : group.sourceName;

    const recipe: any =
      RansomwareRecipes[group.sourceName as keyof typeof RansomwareRecipes];

    let victimNodes;
    if (recipe && recipe.victimRowSelector) {
      victimNodes = $(recipe.victimRowSelector);
    } else {
      victimNodes = $('.post, .card, .grid-item, .victim, article');
    }

    if (victimNodes.length === 0) return;

    for (const element of victimNodes.toArray()) {
      const victimName =
        recipe && recipe.fields?.name
          ? $(element).find(recipe.fields.name).first().text().trim()
          : $(element).find('h2, h3, h4, .title, .name').first().text().trim();

      if (!victimName) continue;

      let websiteText = '';
      if (recipe && recipe.fields?.website) {
        websiteText = $(element)
          .find(recipe.fields.website)
          .first()
          .text()
          .trim();
      } else if (
        victimName.match(/\.[a-z]{2,4}$/i) &&
        !victimName.includes(' ') &&
        !victimName.match(/(?:^[a-zA-Z]\.)|(?:\.[a-zA-Z]\.)/)
      ) {
        websiteText = victimName;
      }

      let victimWebsiteObj = {};
      if (websiteText) {
        websiteText = websiteText.split(/\s+/)[0];
        if (!websiteText.startsWith('http')) {
          websiteText = `https://${websiteText}`;
        }
        victimWebsiteObj = await this.parsers.parseUrl(websiteText);
      }

      const dateText =
        recipe && recipe.fields?.dateText
          ? $(element).find(recipe.fields.dateText).first().text().trim()
          : $(element)
              .find('.date, .time, time, .published')
              .first()
              .text()
              .trim();
      const eventTime = dateText
        ? new Date(dateText).toISOString()
        : new Date().toISOString();

      const linkSelector =
        recipe && recipe.fields?.links ? recipe.fields.links : 'a';
      const links = $(element).find(linkSelector);
      const leakedFiles: { file_name: string; file_url: string }[] = [];

      links.each((j, link) => {
        const href = $(link).attr('href');
        const linkText = $(link).text().toLowerCase();
        const isRecipeLink = recipe && recipe.fields?.links;

        if (
          href &&
          (isRecipeLink ||
            linkText.includes('download') ||
            linkText.includes('leak') ||
            linkText.includes('full') ||
            linkText.includes('open'))
        ) {
          let cleanFileName = $(link).text().trim().replace(/\s+/g, ' ');
          const genericLabels = [
            'open',
            'download',
            'leak',
            'full',
            'read more',
            'view',
            'archive',
          ];
          if (genericLabels.includes(cleanFileName.toLowerCase()))
            cleanFileName = '';

          let isFile = false;
          try {
            const safeUrl = new URL(href, 'http://dummy.url');
            const extension = safeUrl.pathname.split('.').pop()?.toLowerCase();
            const validExtensions = [
              'zip',
              'rar',
              '7z',
              'tar',
              'gz',
              'tgz',
              'bz2',
              'txt',
              'csv',
              'pdf',
              'sql',
              'bak',
              'db',
              'doc',
              'docx',
              'xls',
              'xlsx',
            ];
            if (extension && validExtensions.includes(extension)) isFile = true;
          } catch (e) {}

          if (isFile) {
            if (cleanFileName.startsWith('http')) {
              cleanFileName = cleanFileName.split('/').pop() || cleanFileName;
            }
            leakedFiles.push({ file_name: cleanFileName, file_url: href });
          }
        }
      });

      const dataAvailable = leakedFiles.length > 0;
      const rawId = `${group.sourceName}-${victimName}-${eventTime}`;
      const hashedId = createHash('md5').update(rawId).digest('hex');

      const victimObj = {
        id: hashedId,
        victim_name: victimName,
        victim_website: victimWebsiteObj,
        event_time: eventTime,
        data_available_to_download: dataAvailable,
        leaked_files: leakedFiles,
        removed: false,
        collection_info: {
          type: 'RANSOMWARE_VICTIM',
          ingest_time: new Date().toISOString(),
          source: targetUrl,
          source_name: coverName,
          malware_type: group.sourceName,
        },
      };

      this.parsedRawPosts.push(victimObj);
    }

    this.loggerService.info(
      `${loggerHeader}:: Successfully parsed victims for ${group.sourceName} on current page/modal`,
    );
  }

  protected async processShop(): Promise<any> {
    const result = await super.processShop();
    return {
      ...result,
      data: this.parsedRawPosts,
    };
  }
}
