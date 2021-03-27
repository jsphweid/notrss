import { DBUtils } from "../db-utils";
import { Version } from "../version";

interface AddNewSnapshotRequest {
  site: string;
  objectStorageKey: string;
  diffObjectStorageKey?: string;
}
export const _addNewSnapshot = (
  request: AddNewSnapshotRequest
): Promise<void> =>
  DBUtils.documentClient
    .get({
      TableName: DBUtils.tableName,
      Key: { PK: request.site, SK: Version.CURRENT },
    })
    .promise()
    .then((response) => {
      const latestVersion = response.Item?.Latest || 0;
      const nextVersion = latestVersion + 1;
      const now = Date.now();

      return DBUtils.documentClient
        .transactWrite({
          TransactItems: [
            {
              Update: {
                Key: { PK: request.site, SK: Version.CURRENT },
                ConditionExpression:
                  "attribute_not_exists(#latest) OR #latest = :latest",
                UpdateExpression:
                  "SET #latest = :nextVersion, #dateCreated = :dateCreated, #objectKey = :objectKey, #diffObjectKey = :diffObjectKey",
                ExpressionAttributeNames: {
                  "#latest": "Latest",
                  "#dateCreated": "DateCreated",
                  "#objectKey": "ObjectKey",
                  "#diffObjectKey": "DiffObjectKey",
                },
                ExpressionAttributeValues: {
                  ":latest": latestVersion,
                  ":nextVersion": nextVersion,
                  ":dateCreated": now,
                  ":objectKey": request.objectStorageKey,
                  ":diffObjectKey": request.diffObjectStorageKey || null,
                },
                TableName: DBUtils.tableName,
              },
            },
            {
              Put: {
                Item: {
                  PK: request.site,
                  SK: Version.fromInt(nextVersion),
                  DateCreated: now,
                  Type: "Snapshot",
                  ObjectKey: request.objectStorageKey,
                  DiffObjectKey: request.diffObjectStorageKey,
                },
                TableName: DBUtils.tableName,
              },
            },
          ],
        })
        .promise();
    })
    .then(() => {
      return;
    });
