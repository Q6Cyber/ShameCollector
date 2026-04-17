/**
 * @description Collection phone object definition
 * @export
 * @class PhoneCollectionRequest
 */
export class PhoneCollectionRequest {
  sourceName: string;
  action: string;
  credType: string;
  takeScreenshot?: boolean;
  sessionInfo?: any;
}
