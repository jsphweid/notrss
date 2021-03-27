import { DBUtils } from "../db-utils";

interface DynamoDBLatestItem {
  SK: string; // always going to be v000000 on `Latest` sparse index
  Latest: number;
  PK: string; // URL
  DateCreated: number; // milliseconds since Epoch
  Type: string;
  ObjectKey?: string;
}

interface LatestSnapshotItem {
  latestVersionNumber: number;
  site: string;
  dateCreated: Date;
  objectStorageKey?: string;
}

export const _getAllLatestItems = async (): Promise<LatestSnapshotItem[]> => {
  const allItems: LatestSnapshotItem[] = [];
  const scan = async (startKey?: AWS.DynamoDB.Key) => {
    const response = await DBUtils.documentClient
      .scan({
        TableName: DBUtils.tableName,
        IndexName: DBUtils.sparseIndexName,
        ExclusiveStartKey: startKey,
      })
      .promise();
    const items = (response.Items as DynamoDBLatestItem[]) || [];
    items.forEach((item) => {
      allItems.push({
        latestVersionNumber: item.Latest,
        site: item.PK,
        dateCreated: new Date(item.DateCreated),
        objectStorageKey: item.ObjectKey,
      });
    });
    if (typeof response.LastEvaluatedKey !== "undefined") {
      await scan(response.LastEvaluatedKey);
    }
  };
  await scan();
  return allItems;
};
