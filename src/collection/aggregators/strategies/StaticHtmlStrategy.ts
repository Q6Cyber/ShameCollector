import { WebDriver } from 'selenium-webdriver';
import {
  ExtractionStrategy,
  ProcessHtmlCallback,
  Recipe,
} from './ExtractionStrategy';
import { RansomwareGroup } from '../../models/RansomwareGroup';

export class StaticHtmlStrategy implements ExtractionStrategy {
  async extractData(
    group: RansomwareGroup,
    driver: WebDriver,
    targetUrl: string,
    processHtml: ProcessHtmlCallback,
    recipe?: Recipe,
  ): Promise<void> {
    try {
      const pageSource = await driver.getPageSource();
      await processHtml(group, pageSource, targetUrl);
    } catch (error) {
      console.error(
        `Error in static html extraction strategy for ${group.sourceName}`,
        error,
      );
    }
  }
}
