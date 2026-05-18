import { WebDriver } from 'selenium-webdriver';
import { RansomwareGroup } from '../../models/RansomwareGroup';

export interface Recipe {
  clickSelector?: string;
  closeSelector?: string;
  modalSelector?: string;
  victimRowSelector?: string;
  fields?: {
    name?: string;
    dateText?: string;
    website?: string;
    links?: string;
  };
}

export interface ProcessHtmlCallback {
  (group: RansomwareGroup, html: string, targetUrl: string): Promise<void>;
}

export interface ExtractionStrategy {
  extractData(
    group: RansomwareGroup,
    driver: WebDriver,
    targetUrl: string,
    processHtml: ProcessHtmlCallback,
    recipe?: Recipe,
  ): Promise<void>;
}
