import * as AWS from "aws-sdk";

import { DBUtils } from "../db-utils";

export const _deleteSites = (sites: string[]): Promise<any> =>
  Promise.all(
    sites.map(async (site) => {
      const queryAndDelete = (startKey?: AWS.DynamoDB.Key) =>
        DBUtils.documentClient
          .query({
            TableName: DBUtils.tableName,
            KeyConditionExpression: "#PK = :site",
            ExpressionAttributeNames: { "#PK": "PK" },
            ExclusiveStartKey: startKey || undefined,
            ExpressionAttributeValues: { ":site": site },
            ProjectionExpression: "SK",
          })
          .promise()
          .then(async (result) => {
            await DBUtils.deleteKeys(
              result.Items?.map((item) => ({ PK: site, SK: item.SK })) || []
            );
            if (result.LastEvaluatedKey) {
              await queryAndDelete(result.LastEvaluatedKey);
            }
          });
      await queryAndDelete();
    })
  );
