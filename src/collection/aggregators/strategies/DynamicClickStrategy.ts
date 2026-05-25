import { By, until, WebDriver } from 'selenium-webdriver';
import sleep from 'await-sleep';
import {
  ExtractionStrategy,
  ProcessHtmlCallback,
  Recipe,
} from './ExtractionStrategy';
import { RansomwareGroup } from '../../models/RansomwareGroup';

import { Logger } from '@nestjs/common';

export class DynamicClickStrategy implements ExtractionStrategy {
  private readonly logger = new Logger(DynamicClickStrategy.name);
  async extractData(
    group: RansomwareGroup,
    driver: WebDriver,
    targetUrl: string,
    processHtml: ProcessHtmlCallback,
    recipe?: Recipe,
  ): Promise<void> {
    if (!recipe || !recipe.clickSelector) return;

    try {
      const initialButtons = await driver.findElements(
        By.xpath(recipe.clickSelector),
      );
      const totalButtons = initialButtons.length;

      for (let i = 0; i < totalButtons; i++) {
        const currentButtons = await driver.findElements(
          By.xpath(recipe.clickSelector),
        );

        if (!currentButtons[i]) continue;
        const buttonToClick = currentButtons[i];

        let cardHtml = '';
        try {
          cardHtml = await driver.executeScript<string>(
            "var btn = arguments[0]; return (btn.closest('.card, .news-card, .grid-item, article') || btn.parentNode).outerHTML;",
            buttonToClick,
          );
        } catch (e) {
          this.logger.error(
            `Failed to extract card HTML for ${group.sourceName}`,
            e,
          );
        }

        try {
          await driver.executeScript(
            'arguments[0].scrollIntoView(true);',
            buttonToClick,
          );
          await sleep(600);
          await buttonToClick.click();
        } catch (clickErr) {
          await driver.executeScript('arguments[0].click();', buttonToClick);
        }

        await sleep(2000);

        let modalHtml = '';
        try {
          const modalSel = recipe.modalSelector || '.modal-content, .modal';
          modalHtml = await driver.executeScript<string>(
            `const modals = document.querySelectorAll(arguments[0]);
             let activeModal = null;
             for(let m of modals) {
               if(m.getBoundingClientRect().height > 0) { 
                 activeModal = m;
                 break;
               }
             }
             return activeModal ? activeModal.outerHTML : '';`,
            modalSel,
          );
        } catch (e) {
          this.logger.error(
            `Failed to extract modal HTML for ${group.sourceName}`,
            e,
          );
        }

        const combinedHtml = `<div class="synthetic-victim-wrapper">\n${cardHtml}\n${modalHtml}\n</div>`;
        await processHtml(group, combinedHtml, targetUrl);

        try {
          if (recipe.closeSelector) {
            await driver.executeScript(
              `const closeBtns = document.querySelectorAll(arguments[0]);
               for(let btn of closeBtns) {
                 if(btn.getBoundingClientRect().height > 0) {
                   btn.click();
                 }
               }`,
              recipe.closeSelector,
            );
            await sleep(1500);
          }
        } catch (closeErr) {}
      }
    } catch (error) {
      this.logger.error(
        `Error in dynamic click loop strategy for ${group.sourceName}`,
        error,
      );
    }
  }
}
