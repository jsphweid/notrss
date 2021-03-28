import { Snapshot } from ".";
import { DB } from "..";
import { Utils } from "../../../utils";
import { ObjectStorage } from "../../object-storage";
import { DBUtils } from "../db-utils";
import { Version } from "../version";

interface DynamoDBSnapshotItem {
  DateCreated: number;
  PK: string;
  SK: string;
  ObjectKey: string;
  DiffObjectKey?: string | null;
}

const dynamoDBItemToSnapshot = (item: DynamoDBSnapshotItem): Snapshot => ({
  dateCreated: new Date(item.DateCreated),
  site: item.PK,
  version: parseInt(item.SK.split("v")[1]),
  objectStorageKey: item.ObjectKey,
  diffObjectStorageKey: item.DiffObjectKey || null,
});

export interface GetSnapshotResult {
  site: string;
  totalCount: number | null;
  edges: { cursor: string; node: Snapshot }[];
  pageInfo: {
    startCursor: string | null;
    endCursor: string | null;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

interface GetSnapshotsOptions {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  includeTotalCount?: boolean | null;
}
export const _getSnapshots = async (
  site: string,
  options?: GetSnapshotsOptions
): Promise<GetSnapshotResult> => {
  let results: DynamoDBSnapshotItem[] = [];
  let hasNextPage = false;

  if (options?.first && options.first < 0) {
    throw new Error("`first` cannot be below 0");
  }
  if (options?.last && options.last < 0) {
    throw new Error("`last` cannot be below 0");
  }
  if (options?.last && !options?.before) {
    throw new Error("Cannot use `last` without `before`");
  }

  const query = (start?: string) =>
    DBUtils.documentClient
      .query({
        TableName: DBUtils.tableName,
        KeyConditionExpression: "#PK = :site and begins_with(#SK, :startsWith)",
        ExclusiveStartKey: {
          PK: site,
          SK: options?.after
            ? Utils.base64Decode(options.after)
            : options?.before
            ? Utils.base64Decode(options.before)
            : Version.CURRENT,
        },
        ExpressionAttributeNames: {
          "#PK": "PK",
          "#SK": "SK",
        },
        ScanIndexForward: !options?.before,
        Limit: options?.first
          ? options.first + 1
          : options?.last
          ? options.last + 1
          : undefined,
        ExpressionAttributeValues: {
          ":site": site,
          ":startsWith": "v",
        },
      })
      .promise()
      .then(async (result) => {
        let dynamoDBItems = (result["Items"] as DynamoDBSnapshotItem[]) || [];
        dynamoDBItems = dynamoDBItems.filter(
          (item) => item.SK !== Version.CURRENT
        );
        hasNextPage = options?.first
          ? dynamoDBItems.length > options.first
          : typeof result.LastEvaluatedKey !== "undefined";

        if (hasNextPage) {
          dynamoDBItems = dynamoDBItems.slice(0, -1);
        }
        dynamoDBItems.forEach((item) => results.push(item));

        if (
          typeof result.LastEvaluatedKey !== "undefined" &&
          dynamoDBItems.length !== options?.first &&
          dynamoDBItems.length !== options?.last
        ) {
          await query(result.LastEvaluatedKey.SK);
        }
      });

  DB.getTotalCountBySite(site);
  const [maybeTotalCount, _] = await Promise.all([
    options?.includeTotalCount ? DB.getTotalCountBySite(site) : null,
    query(), // this will load all other info
  ]);

  return {
    site,
    totalCount: maybeTotalCount,
    edges: results.map((result) => ({
      node: { ...dynamoDBItemToSnapshot(result) },
      cursor: Utils.base64Encode(result.SK),
    })),
    pageInfo: {
      startCursor: results.length ? Utils.base64Encode(results[0].SK) : null,
      endCursor: results.length
        ? Utils.base64Encode(results[results.length - 1].SK)
        : null,
      hasNextPage,
      hasPreviousPage: results.length
        ? results[0].SK !== Version.fromInt(1)
        : false,
    },
  };
};
