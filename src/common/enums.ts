export enum RequestType {
  HttpPost = 'POST',
  HttpGet = 'GET',
}

export enum ProcessResult {
  ERROR = 0,
  SUCCESS,
  SESSION_EXPIRED,
  END_OF_STORE,
  RETRY,
  NEED_REFRESH,
  INVALID_THREAD,
}

export enum ErrorCustomCode {
  SELENIUM_ERROR = 30000,
  ELASTIC_ERROR,
  FORK_ERROR,
}

export enum selectorTypes {
  css = 'css',
  rgx = 'rgx',
  cssAttr = 'cssAttr',
}
