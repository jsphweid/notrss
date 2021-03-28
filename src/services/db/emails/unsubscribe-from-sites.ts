import { DBUtils } from "../db-utils";

export const _unsubscribeEmailFromSites = (request: {
  email: string;
  sites: string[];
}): Promise<any> =>
  DBUtils.deleteKeys(
    request.sites.map((site) => ({ PK: site, SK: `Email#${request.email}` }))
  );
