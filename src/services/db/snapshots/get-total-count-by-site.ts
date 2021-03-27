import { DBUtils } from "../db-utils";
import { Version } from "../version";

export const _getTotalCountBySite = async (site: string): Promise<number> =>
  DBUtils.documentClient
    .get({
      Key: {
        PK: site,
        SK: Version.CURRENT,
      },
      TableName: DBUtils.tableName,
    })
    .promise()
    .then((result) => (result.Item ? result.Item.Latest : 0));
