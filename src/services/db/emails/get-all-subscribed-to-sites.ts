import { DBUtils } from "../db-utils";

export const _getAllEmailsSubscribedToSite = (
  site: string
): Promise<string[]> =>
  DBUtils.documentClient
    .query({
      TableName: DBUtils.tableName,
      KeyConditionExpression: "#PK = :site and begins_with(#SK, :prefix)",
      ExpressionAttributeNames: {
        "#PK": "PK",
        "#SK": "SK",
      },
      ExpressionAttributeValues: {
        ":site": site,
        ":prefix": "Email#",
      },
      ProjectionExpression: "SK",
    })
    .promise()
    .then(
      (result) =>
        result["Items"]?.map((item) => item["SK"].split("Email#")[1]) || []
    );
