/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint @typescript-eslint/no-var-requires: "off" */
// eslint-disable-next-line
import UserAgent from 'user-agents';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../global/services/logger.service';

const {
  Capabilities,
  Builder,
  By,
  until,
  Session,
  WebDriver,
} = require('selenium-webdriver');
const { HttpClient, Executor } = require('selenium-webdriver/http');
const moment = require('moment');
const proxy = require('selenium-webdriver/proxy');
const firefox = require('selenium-webdriver/firefox');
const fs = require('fs');
const path = require('path');

interface IConnectBrowser {
  seleniumSessionId: string;
}

@Injectable()
export class SeleniumService {
  private readonly LOG_MESSAGE = 'SeleniumService';
  public driver;
  public readonly By;
  public readonly until;
  private readonly proxyType: string;
  private readonly proxyTypeString: string;
  public readonly driverType: string;
  private userAgent: UserAgent;
  private readonly hasCloudFlare: boolean;
  private target: string;
  private readonly server: string;
  private readonly port: string;
  private isSock5 = false;

  constructor(
    protected loggerService: LoggerService,
    driverType,
    targetProxy,
    hasCloudFlare,
    target,
  ) {
    const proxyConfig = this.setProxy(targetProxy);
    this.proxyType = this.port = proxyConfig.port;
    this.server = proxyConfig.server;
    this.isSock5 = proxyConfig.SOCK5 || false;
    this.proxyTypeString = targetProxy;
    this.driverType = driverType;
    this.By = By;
    this.until = until;
    this.userAgent = new UserAgent({ platform: 'Win32' });
    this.hasCloudFlare = hasCloudFlare;
    this.target = target;
  }

  private generateUserAgent() {
    const userAgents = Array(400)
      .fill(400)
      .map(() => this.userAgent.toString());
    const uniqueUserAgents = [
      ...new Set(
        userAgents.filter((userAgent) => !userAgent.includes('Linux')),
      ),
    ];
    return uniqueUserAgents[
      Math.floor(Math.random() * uniqueUserAgents.length)
    ];
  }

  private getSeleniumURL() {
    return process.env.SELENIUM_REMOTE_URL;
  }

  public async initializeDriver() {
    const loggerHeader = `${this.LOG_MESSAGE}::initializeDriver`;
    try {
      let userAgent = this.generateUserAgent();
      let torUserAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';
      const proxyManualConfig = {
        https: `${this.server}:${this.port}`,
        http: `${this.server}:${this.port}`,
      };

      if (this.hasCloudFlare) {
        userAgent =
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.108 Safari/537.15';
        torUserAgent =
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.108 Safari/537.15';
      }

      if (this.driverType === 'Firefox') {
        const screen = {
          width: 2880,
          height: 1800,
        };
        const firefoxOptions = new firefox.Options();
        if (process.env.HEADLESS === '0') {
          // Set the width and height
          firefoxOptions.addArguments('--width=1600');
          firefoxOptions.addArguments('--height=1200');
        }

        if (process.env.FIREFOX_PROFILE_PATH) {
          if (this.target === 'CraxPro.io' || this.target === 'wwh-') {
            const profilePath = process.env.FIREFOX_PROFILE_PATH;
            const filesToDelete = ['lock', '.parentlock', 'parent.lock'];
            filesToDelete.forEach((filename) => {
              const filePath = path.join(profilePath, filename);
              try {
                if (
                  fs.existsSync(filePath) ||
                  fs.lstatSync(filePath).isSymbolicLink()
                ) {
                  fs.unlinkSync(filePath);
                }
              } catch (err) {}
            });
            firefoxOptions.addArguments('-profile', profilePath);
          }
        }
        firefoxOptions.setAcceptInsecureCerts(true);
        if (process.env.HEADLESS === '1') {
          firefoxOptions.headless().windowSize(screen);
        }
        //common setup
        firefoxOptions
          .setPreference('useAutomationExtension', false)
          .setPreference('webgl.disabled', false)
          .setPreference('browser.cache.disk.enable', false)
          .setPreference('browser.cache.memory.enable', false)
          .setPreference('browser.cache.offline.enable', false)
          .setPreference('network.http.use-cache', false)
          .setPreference('extensions.firebug.onByDefault', false);

        if (this.isSock5) {
          firefoxOptions
            .setPreference('general.useragent.override', torUserAgent)
            .setPreference('network.proxy.type', 1) // manual proxy config
            .setPreference('network.proxy.socks', this.server)
            .setPreference('network.proxy.socks_port', Number(this.port))
            .setPreference('network.proxy.socks_remote_dns', true) // resolve DNS over Tor
            .setPreference('network.proxy.socks_version', 5)
            .setPreference('dom.webdriver.enabled', false);

          this.driver = await new Builder()
            .usingServer(this.getSeleniumURL())
            .forBrowser('firefox')
            .setFirefoxOptions(firefoxOptions)
            .build();
        } else {
          firefoxOptions
            .setPreference('security.mixed_content.block_active_content', false)
            .setPreference('security.mixed_content.block_display_content', true)
            .setPreference('javascript.enabled', true)
            .setPreference('general.useragent.override', userAgent);

          this.driver = await new Builder()
            .usingServer(this.getSeleniumURL())
            .forBrowser('firefox')
            .setFirefoxOptions(firefoxOptions)
            .setProxy(proxy.manual(proxyManualConfig))
            .build();
        }
      }

      if (this.driverType === 'Chrome') {
        const chromeCapabilities = Capabilities.chrome();
        const chromeOptions = {
          w3c: true,
          args: [
            '--no-sandbox',
            '--window-size=2048,1536',
            '--disable-blink-features',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--disable-extensions',
            '--disable-application-cache',
            '--disable-gpu',
            '--disable-dev-shm-usage',
          ],
        };
        if (process.env.HEADLESS === '1') {
          // chromeOptions.args.push('--headless');
        }
        if (this.isSock5) {
          chromeOptions.args.push(
            `user-agent=${torUserAgent}`,
            `--proxy-server=socks5://${this.server}:${this.port}`,
          );
          chromeCapabilities.set('goog:chromeOptions', chromeOptions);
          this.driver = await new Builder()
            .usingServer(this.getSeleniumURL())
            .forBrowser('chrome')
            .withCapabilities(chromeCapabilities)
            .build();
        } else {
          chromeOptions.args.push(`user-agent=${userAgent}`);
          chromeCapabilities.set('goog:chromeOptions', chromeOptions);
          this.driver = await new Builder()
            .usingServer(this.getSeleniumURL())
            .forBrowser('chrome')
            .withCapabilities(chromeCapabilities)
            .setProxy(proxy.manual(proxyManualConfig))
            .build();
        }
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error getting selenium browser.`,
        error,
      );
      throw error;
    }
  }

  public async connectToBrowser(params: IConnectBrowser) {
    const loggerHeader = `${this.LOG_MESSAGE}::connectToBrowser`;
    try {
      const client = await new HttpClient(process.env.SELENIUM_REMOTE_URL_1);
      const executor = await new Executor(client);
      const session = await new Session(params.seleniumSessionId);
      this.driver = await new WebDriver(session, executor);
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error connecting to browser.`,
        error,
      );
      throw error;
    }
  }

  public getProxyType(): string {
    return this.proxyType;
  }

  private setProxy(proxyType) {
    const PROXY_CONFIG = {
      TOR_SOCKS: {
        port: 5566,
        server: '172.28.0.22',
        SOCK5: true,
      },
      PROXY: {
        port: 1080,
        server: '172.21.19.35',
        SOCK5: true,
      },
      LONDON1: {
        port: 1080,
        server: '172.21.19.52',
        SOCK5: true,
      },
      LONDON2: {
        port: 1080,
        server: '172.21.19.60',
        SOCK5: true,
      },
      PROXY1: {
        port: 8001,
        server: 'proxy.internal.q6cyber.com',
      },
      PROXY3: {
        port: 8003,
        server: 'proxy.internal.q6cyber.com',
      },
      PROXY15: {
        port: 8015,
        server: 'proxy.internal.q6cyber.com',
      },
      TOR: {
        port: 8118,
        server: '172.28.0.22',
      },
      PROXY_RES: {
        port: 8070,
        server: 'proxy.internal.q6cyber.com',
      },
    };
    return PROXY_CONFIG[proxyType];
  }

  public async findElement(
    selenium: SeleniumService,
    cssSelector: string,
    byCssSelector = true,
  ) {
    // eslint-disable-next-line no-useless-catch
    try {
      let searchCriteria;
      if (byCssSelector) {
        searchCriteria = selenium.By.css(cssSelector);
      }
      const element = await selenium.driver.wait(
        selenium.until.elementLocated(searchCriteria),
        20000,
      );
      return element;
    } catch (error) {
      throw error;
    }
  }

  public async setValElement(
    selenium: SeleniumService,
    cssSelector: string,
    value: string,
    byCssSelector = true,
  ) {
    // eslint-disable-next-line no-useless-catch
    try {
      const element = await this.findElement(selenium, cssSelector);
      await element.clear();
      await element.sendKeys(value);
      return element;
    } catch (error) {
      throw error;
    }
  }

  private cookieString(cookie) {
    if (!cookie.expires) {
      cookie.expires = moment().format('llll');
    }
    return `${cookie.name}=${cookie.value}; expires=${cookie.expires}; path=${cookie.path}; domain=${cookie.domain}`;
  }

  public getCookiesString(cookies) {
    const arrCookiesString: string[] = [];
    for (const cookie of cookies) {
      let cookieExp;
      let cookieExpDate;
      if (cookie.expiry) {
        cookieExp = new Date(Date.now() + cookie.expiry);
        cookieExpDate = new moment(cookieExp).format('llll');
        cookie.expires = cookieExpDate;
      }
      arrCookiesString.push(this.cookieString(cookie));
    }
    return arrCookiesString;
  }

  getCapabilities(seleniumSessionInfo) {
    const capabilitieResult = {};
    Array.from(seleniumSessionInfo['caps_'].map_.entries(), (entry: any) => {
      capabilitieResult[entry[0]] = entry[1];
    });
    return capabilitieResult;
  }

  public async getValueFromHideInput(
    inputName: string,
    selenium: SeleniumService,
  ): Promise<string> {
    const selector = `document.querySelector("input[name=${inputName}]").removeAttribute("type")`;
    await this.driver.executeScript(selector);
    const inputValue = await this.findElement(
      selenium,
      `input[name='${inputName}']`,
    );
    return await inputValue.getAttribute('value');
  }

  async setCookies(cookies) {
    const loggerHeader = `${this.LOG_MESSAGE}::setCookies`;
    try {
      for (const cookie of cookies) {
        await this.driver.manage().addCookie({
          name: cookie.split('=')[0],
          value: cookie.split('=')[1].split(';')[0],
          sameSite: 'Strict',
        });
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error setting cookies.`,
        error,
      );
      throw error;
    }
  }
}
