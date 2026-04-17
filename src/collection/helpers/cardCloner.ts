import { Injectable } from '@nestjs/common';

/**
 * @description Card helper with cloner functionalities
 * @export
 * @class CardCloner
 */
@Injectable()
export class CardCloner {
  protected readonly LOG_MESSAGE = 'CardCloner';

  /**
   *Creates an instance of CardCloner.
   * @memberof CardCloner
   */
  constructor() {}

  /**
   * @description Clone a source object, it can select attributes for copy or delete
   * @param {*} source
   * @param {string[]} [attributes=null]
   * @param {string[]} [deleteAttributes=null]
   * @returns {Promise<any>}
   * @memberof CardCloner
   */
  async clone(
    source: any,
    attributes: string[] = [],
    deleteAttributes: string[] = [],
  ): Promise<any> {
    const obj: any = {};
    // copy attributes
    if (!attributes) {
      Object.assign(obj, source);
    } else {
      for (const attribute of attributes) {
        if (source[attribute]) {
          obj[attribute] = source[attribute];
        }
      }
    }
    // delete attributes
    if (deleteAttributes) {
      for (const deleteAttri of deleteAttributes) {
        delete obj[deleteAttri];
      }
    }

    return obj;
  }
}
