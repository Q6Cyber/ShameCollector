import { Injectable } from '@nestjs/common';
import { LoggerService } from '../global/services/logger.service';
import { PROXY_SOCKS_CONFIG } from '../common/proxy.config';
import * as util from 'util';
import axios, { Method, AxiosRequestConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import httpsProxyAgent from 'https-proxy-agent';
import { TextDecoder } from 'text-decoding';
import * as iconv from 'iconv-lite';
import lodash from 'lodash';

@Injectable()
export class RequestService {
  private readonly LOG_MESSAGE = 'RequestService';
  protected httpsAgent;
  protected headers;
  constructor(protected loggerService: LoggerService) {}

  /**
   * @description function in charge of make a simple axios request
   * @param {Method} method on use get - post
   * @param {string} url endpoint
   * @param {*} data - data params used on post request
   * @param {*} params - data params used on get request
   * @returns {Promise<any>}
   * @memberof RequestService
   */
  async request(
    method: Method,
    url: string,
    data: any,
    params: any,
    headers?: any,
    decoderType = 'textDecoder',
  ): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::request`;
    let result;
    try {
      let config: AxiosRequestConfig = {
        method,
        url,
        data,
        params,
        timeout: 30000,
        httpsAgent: this.httpsAgent,
        httpAgent: this.httpsAgent,
        responseType: 'arraybuffer',
        responseEncoding: 'binary',
      };
      if (headers) {
        config = {
          ...config,
          headers,
        };
      }

      if (!data) {
        delete config.data;
      }

      if (!params) {
        delete config.params;
      }
      const requestResult = await axios(config);

      let decoder;
      let html;
      if (decoderType === 'textDecoder') {
        decoder = new TextDecoder('windows-1251');
        html = decoder.decode(requestResult.data);
      } else if (decoderType === 'iconv') {
        decoder = requestResult.data;
        html = iconv.decode(decoder, 'utf-8');
      }

      const response = {
        statusCode: requestResult.status,
        statusMessage: requestResult.statusText,
        data: html,
        requestComplete: true,
      };

      return response;
    } catch (error) {
      let decoder: any = null;
      let html: any = null;
      let statusCode: any = null;
      let statusMessage = null;
      if (decoderType === 'textDecoder') {
        decoder = new TextDecoder('windows-1251');
        const dataToDecode = lodash.get(error, 'response.data', null);
        if (dataToDecode) {
          html = decoder.decode(error.response.data);
        } else {
          html = null;
        }
      } else if (decoderType === 'iconv') {
        decoder = lodash.get(error, 'response.data', null);
        if (decoder) {
          html = iconv.decode(decoder, 'utf-8');
        }
      }
      statusCode = lodash.get(error, 'response.status', null);
      statusMessage = lodash.get(error, 'response.statusText', null);
      result = {
        statusCode: statusCode,
        statusMessage: statusMessage,
        data: html,
        requestComplete: false,
      };
      const dataError = {
        message: 'Error making axios request',
        error: util.inspect(error),
      };
      this.loggerService.error(
        `${loggerHeader}::Error making Axios Request`,
        dataError,
      );
    }
    return result;
  }

  async getCredentials(source: string, username: string): Promise<any> {
    await this.request(
      'get',
      `${process.env.LOGIN_HOST}/api/v2/checkConnectionInfo`,
      {},
      {
        sessionId: 'TODO',
        targetName: source,
        username,
        keepSeleniumSession: false,
      },
    );
    return true;
  }

  async getForumCredentials(
    source: string,
    username: string,
    privateMessages: boolean,
  ): Promise<any> {
    await this.request(
      'get',
      `${process.env.LOGIN_HOST}/api/v2/getForumLogin`,
      {},
      {
        source,
        username,
        isForumLogin: true,
        isPrivateMessages: privateMessages,
      },
    );
    return true;
  }

  getProxyConfig(proxy) {
    switch (proxy) {
      case '':
        break;
    }
  }

  parseForumCookies(cookies) {
    try {
      let cookiesStr = '';
      for (const cookie of cookies) {
        cookiesStr += `${cookie.split(';')[0]}; `;
      }
      return cookiesStr;
    } catch (error) {
      this.loggerService.error(
        `Error parsing forum cookies: ${util.inspect(error)}`,
      );
      return '';
    }
  }

  async setRequestInformation(proxy, url, cookies, user_agent) {
    try {
      let headers = {};
      if (PROXY_SOCKS_CONFIG[proxy]) {
        const { server, port, httpProxy } = PROXY_SOCKS_CONFIG[proxy];
        if (!httpProxy) {
          this.httpsAgent = new SocksProxyAgent(`socks://${server}:${port}`);
        } else {
          this.httpsAgent = httpsProxyAgent(`http://${server}:${port}`);
        }
        headers = {
          Cookie: this.parseForumCookies(cookies),
          'User-Agent': user_agent,
        };
      }
      await Promise.resolve();
      return headers;
    } catch (error) {
      this.loggerService.error(
        `Error setting request information: ${util.inspect(error)}`,
      );
      return {};
    }
  }
}
