import { Inject, Injectable } from '@nestjs/common';
import { HttpUrl } from '../models/http.model';
import { LoggerService } from '../../global/services/logger.service';
import { data, source } from '@q6cyber/proto2ts/generated';
import { async, ignoreElements } from 'rxjs/dist/types';
import { text } from 'stream/consumers';
// eslint-disable-next-line
const md5 = require('md5');

/**
 * @description Class for handle all parsers types
 * @export
 * @class Parsers
 */
@Injectable()
export class Parsers {
  protected readonly LOG_MESSAGE = 'Parsers';

  /**
   *Creates an instance of Parsers.
   * @param {LoggerService} loggerService
   * @memberof Parsers
   */
  constructor(protected loggerService: LoggerService) {}

  /**
   * @description get an element and if element is string run a clean process
   * @param {*} element
   * @returns
   * @memberof Parsers
   */
  cleanup(element: string) {
    if (typeof element === 'string') {
      element = element
        .trim()
        .replace(/^#?n\/a$/i, '')
        .replace(/^x$/i, '')
        .replace(/^–$/i, '')
        .replace(/^—$/i, '')
        .replace(/^-$/i, '')
        .replace(/…/i, '')
        .replace(/^NONE$/, '')
        .replace(/\*/g, '')
        .replace(/(\$)/g, '')
        .trim();
    }
    return element;
  }

  orderObject(obj, mapping) {
    const orderedObj = {};
    Object.keys(mapping)
      .sort((a, b) => mapping[a] - mapping[b])
      .forEach((key) => {
        if (obj.hasOwnProperty(key)) {
          orderedObj[key] = obj[key];
        }
      });
    Object.keys(obj)
      .filter((key) => !(key in mapping))
      .forEach((key) => {
        orderedObj[key] = obj[key];
      });
    return orderedObj;
  }

  /**
   * @description get a card and build a unique id using important fiels from the card
   * @param {*} card
   * @param {string[]} [extraFields=[]]
   * @param {string[]} [excludeFields=[]]
   * @returns {Promise<any>}
   * @memberof Parsers
   */
  async makeUniqueIdV2(card: any, model: any = {}): Promise<any> {
    const values: any[] = [];
    card = this.orderObject(card, model);
    const fields = Object.keys(model);
    fields.forEach((value) => {
      if (card[value]) {
        values.push(card[value]);
      }
    });
    return 'auto-' + md5(values.join(':'));
  }

  /**
   * @description get a url string data and return a parsed http url object
   * @param {string} urlString
   * @returns {Promise<HttpUrl>}
   * @memberof Parsers
   */
  async parseUrl(urlString: string): Promise<HttpUrl> {
    let result: HttpUrl = {
      host: '',
      full: '',
    };
    const urlParts = urlString.match(/(https?):\/\/([^\/]+)(\/.*)?/);
    if (urlParts) {
      result = {
        proto: urlParts[1],
        host: urlParts[2],
        path: urlParts[3],
        full: urlString,
      };
    }
    return result;
  }

  /**
   * @description Get a concat string as result of all the children fields of an element
   * @param {*} element
   * @param {boolean} [recursive=false]
   * @returns {string}
   * @memberof Parsers
   */
  async getFieldText(
    element: any,
    recursive = false,
    ignoreElements: any[] = [],
  ): Promise<string> {
    let text = '';
    if (element.children) {
      for (const piece of element.children) {
        let removeElement = false;
        if (
          ignoreElements.length > 0 &&
          ignoreElements.includes(element.name)
        ) {
          removeElement = true;
        }
        if (piece.type === 'text' && !removeElement) {
          text += piece.data;
        }
        if (recursive) {
          text += await this.getFieldText(piece, true, ignoreElements);
        }
      }
    }
    return text;
  }

  /**
   * @description Clean up all elements and join them ignoring empty strings
   * @param {*} data
   * @param {string} separator
   * @returns {string}
   * @memberof Parsers
   */
  public joinFields(data: string[], separator: any): string {
    const joinData: any = [];
    data.forEach((element) => {
      element = this.cleanup(element);
      if (element) {
        joinData.push(element);
      }
    });
    return joinData.join(separator);
  }
  /**
   * @description get a object and build a unique id using important fiels from the card
   * @param {*} obj
   * @returns {Promise<any>}
   * @memberof Parsers
   */
  async generateObjectToHash(obj: any): Promise<any> {
    try {
      const values = Array.isArray(obj) ? obj : Object.values(obj);
      return md5(values.join(':'));
    } catch (error) {
      this.loggerService.error('Error on generateObjectToHash');
    }
  }

  async generateSourceToHash(source: any, hashProps): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::generateSourceToHash`;
    try {
      const objToHash = {};
      for (const hashProp of hashProps) {
        if (source[hashProp]) {
          objToHash[hashProp] = source[hashProp];
        }
      }
      const values = Object.values(objToHash);
      return md5(values.join(':'));
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error generating source hash`,
        error,
      );
    }
  }
}
