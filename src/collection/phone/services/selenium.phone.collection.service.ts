/* eslint @typescript-eslint/no-var-requires: "off" */
import { PhoneCollectionService } from '../services/phone.collection.service';
import { PhoneCollectionConfig } from '../../models/shop.model';

export class SeleniumPhone extends PhoneCollectionService {
  protected textValidationCountry = [
    'United States of America',
    'United States',
    'USA',
    'US',
  ];

  constructor(params: PhoneCollectionConfig) {
    super(params);
  }
}
