/* eslint @typescript-eslint/no-var-requires: "off" */
import { DefaultCollectionConfig } from '../models/shop.model';
import { SeleniumDefault } from '../services/selenium.default';

export class RamsonWareLive extends SeleniumDefault {
  constructor(params: DefaultCollectionConfig) {
    super(params);
    this.waitUntilElement = 15000;

    this.searchUrls = [
      { url: '/groups', pagePath: '' },
      // {
      //   url: '/inactive-numbers/',
      //   isActive: false,
      //   pagePath: `//a[@class='page-numbers' and text()=`,
      // },
    ];

    this.selectors = {
      loadingElement: '',
      pathData: `div[class="sms-card"]`,
      balance: `a[class="nav__logo"]`,
      urlParam: 'page/',
      urlTail: '/',
      countryPath: 'h4',
      phonePath: '.sms-card__number a',
      isValidElement: '//a[@class="login-btn"]',
      modalElement: `//p[@class="fc-button-label" and text()='Consent']`,
    };

    this.shopRecipe = ['goTo', 'awaitingTime' /*'searchProcess'*/];
  }
}
