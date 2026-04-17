/* eslint @typescript-eslint/no-var-requires: "off" */
import { PhoneCollectionConfig } from '../../models/shop.model';
import { SeleniumPhone } from '../services/selenium.phone.collection.service';

export class Anonymsms extends SeleniumPhone {
  constructor(params: PhoneCollectionConfig) {
    super(params);
    this.waitUntilElement = 15000;
    this.hasCloudFlare = true;

    this.searchUrls = [
      { url: '/united-states/', isActive: true, pagePath: '' },
      {
        url: '/inactive-numbers/',
        isActive: false,
        pagePath: `//a[@class='page-numbers' and text()=`,
      },
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
  }
}
