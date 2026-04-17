/**
 * @description Http Url object definition
 * @export
 * @class HttpUrl
 */
export class HttpUrl {
  host: string;
  full: string;
  proto?: string;
  path?: string;
}

/**
 * @description Http cookie object definition
 * @export
 * @class HttpCookie
 */
export class HttpCookie {
  domain?: string;
  key: string;
  value: string;
  path?: string;
}

/**
 * @description Http configuration options definition
 * @export
 * @class HttpOptions
 */
export class HttpOptions {
  url: HttpUrl;
  userAgent: string;
  headers?: any;
  secureProtocol?: string;
  proxy: string;
  cookies: string[];
}

/**
 * @description Http default configuration options definition
 * @export
 * @class HttpDefaults
 */
export class HttpDefaults {
  cookies: string[];
  headers: any;
  strictSSL: boolean;
  ciphers: string;
  secureProtocol: string;
  rejectUnauthorized: boolean;
  httpsAgent: any;
  followAllRedirects: boolean;
}

/**
 * @description Http response object definition
 * @export
 * @class HttpResponse
 */
export class HttpResponse {
  success: boolean;
  statusCode: number;
  data: any;
  message: string;
  error?: any;
}

/**
 * @description Proxy types configuration
 * @export
 */
export const ProxyType = {
  NA: null,
  PROXY_RES: {
    host: 'proxy',
    port: 8070,
  },
  PROXY1: {
    host: '172.21.3.15',
    port: 8001,
  },
  PROXY3: {
    host: '172.21.3.15',
    port: 8003,
  },
  PROXY15: {
    host: '172.21.3.15',
    port: 8015,
  },
  TOR: {
    host: 'proxy',
    port: 8118,
  },
};
