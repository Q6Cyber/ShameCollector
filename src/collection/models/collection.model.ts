/**
 * @description Collection shop object definition
 * @export
 * @class CollectionRequest
 */
export class CollectionRequest {
  sourceName: string;
  userName: string;
  sessionInfo?: any;
  filters?: any[];
  action: string;
  credType: string;
  takeScreenshot?: boolean;
  binStats?: any[];
  isPrivateMessages: boolean;
}

export class WhiteListRequest {
  source: string;
  whiteList: string[];
}
