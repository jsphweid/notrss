import { DBUtils } from "../db-utils";

interface Subscription {
  dateCreated: Date;
  email: string;
  site: string;
}

export const _getSubscriptionsByEmail = (
  email: string
): Promise<Subscription[]> =>
  DBUtils.documentClient
    .query({
      TableName: DBUtils.tableName,
      IndexName: DBUtils.inverseIndexName,
      KeyConditionExpression: "#SK = :email",
      ExpressionAttributeNames: {
        "#SK": "SK",
      },
      ExpressionAttributeValues: {
        ":email": `Email#${email}`,
      },
    })
    .promise()
    .then((result) => result["Items"] || [])
    // not necessary but helps tests assert that the type is actually added in the first place
    .then((items) => items.filter((item) => item.Type === "Subscription"))
    .then((items) =>
      items.map((item) => ({
        dateCreated: new Date(item.DateCreated),
        email: item.SK.split("Email#")[1],
        site: item.PK,
      }))
    );
