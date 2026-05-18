export interface ActiveUrl {
  url: string;
  isActive: boolean;
  isValid?: boolean;
  status: string;
  settings?: {
    exactHostMatch?: boolean;
    wildcardPath?: boolean;
    wildcardParams?: boolean;
  };
  lastPasswordLogin?: string | null;
  lastCheck?: string | null;
  lastCookieLogin?: string | null;
  connType?: string;
  driverType?: string;
  lastLoginType?: string;
  requiresLogin?: boolean;
}

export interface RansomwareGroup {
  type?: string;
  state?: string;
  sourceName: string;
  urlList: ActiveUrl[];
  coverName?: string;
  isOnline?: boolean;
  isSubsource?: boolean;
  reaperSettings?: {
    active: boolean;
  };
}
