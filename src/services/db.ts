import * as AWS from "aws-sdk";
import { Maybe } from "../generated";
import { Utils } from "../utils";

export namespace DB {
  const documentClient = new AWS.DynamoDB.DocumentClient({
    convertEmptyValues: true,
    ...(process.env.JEST_WORKER_ID && {
      endpoint: "localhost:8000",
      sslEnabled: false,
      region: "local-env",
    }),
  });

  const tableName = process.env.DYNAMODB_TABLE_NAME as string;
  const sparseIndexName = process.env.DYNAMODB_SPARSE_INDEX_NAME as string;
  const inverseIndexName = process.env.DYNAMODB_2ND_GSI as string;

  interface DynamoDBLatestItem {
    SK: string; // always going to be v0 on `Latest` sparse index
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

  export const getAllLatestItems = async (): Promise<LatestSnapshotItem[]> => {
    const allItems: LatestSnapshotItem[] = [];
    const scan = async (startKey?: AWS.DynamoDB.Key) => {
      const response = await documentClient
        .scan({
          TableName: tableName,
          IndexName: sparseIndexName,
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

  export const ensureSitesAreBeingWatched = (sites: string[]): Promise<any> =>
    Promise.all(
      Utils.chunkArray(sites, 25).map((chunkOfSites) =>
        documentClient
          .batchGet({
            RequestItems: {
              [tableName]: {
                Keys: chunkOfSites.map((site) => ({ PK: site, SK: "v0" })),
              },
            },
          })
          .promise()
          .then((response) =>
            (response.Responses?.[tableName] || []).map((item) => item.PK)
          )
          .then((existingSites) =>
            chunkOfSites.filter((site) => !existingSites.includes(site))
          )
          .then((sitesToAdd) => {
            if (sitesToAdd.length) {
              return documentClient
                .batchWrite({
                  RequestItems: {
                    [tableName]: sitesToAdd.map((site) => ({
                      PutRequest: {
                        Item: {
                          PK: site,
                          SK: "v0",
                          DateCreated: Date.now(),
                          Type: "Snapshot",
                          Latest: 0,
                        },
                      },
                    })),
                  },
                })
                .promise();
            }
          })
      )
    );

  interface Subscription {
    dateCreated: Date;
    email: string;
    site: string;
  }

  export const getSubscriptionsByEmail = (
    email: string
  ): Promise<Subscription[]> =>
    documentClient
      .query({
        TableName: tableName,
        IndexName: inverseIndexName,
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

  export interface Snapshot {
    dateCreated: Date;
    site: string;
    version: number; // TODO: maybe this shouldn't be included as it only has relevance in DB...?
    objectStorageKey: string;
    diffObjectStorageKey: Maybe<string>;
  }

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

  interface GetSnapshotResult {
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
  }
  export const getSnapshots = async (
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
      documentClient
        .query({
          TableName: tableName,
          KeyConditionExpression:
            "#PK = :site and begins_with(#SK, :startsWith)",
          ExclusiveStartKey: {
            PK: site,
            SK: options?.after
              ? Utils.base64Decode(options.after)
              : options?.before
              ? Utils.base64Decode(options.before)
              : "v0",
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
          dynamoDBItems = dynamoDBItems.filter((item) => item.SK !== "v0");
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

    await query();

    return {
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
        hasPreviousPage: results.length ? results[0].SK !== "v1" : false,
      },
    };
  };

  export const subscribeEmailToSites = (request: {
    email: string;
    sites: string[];
  }): Promise<any> =>
    ensureSitesAreBeingWatched(request.sites).then(() =>
      Promise.all(
        Utils.chunkArray(request.sites, 25).map((chunkOfSites) =>
          documentClient
            .batchWrite({
              RequestItems: {
                [tableName]: chunkOfSites.map((site) => ({
                  PutRequest: {
                    Item: {
                      PK: site,
                      SK: `Email#${request.email}`,
                      DateCreated: Date.now(),
                      Type: "Subscription",
                    },
                  },
                })),
              },
            })
            .promise()
        )
      )
    );

  export const getAllEmailsSubscribedToSite = (
    site: string
  ): Promise<string[]> =>
    documentClient
      .query({
        TableName: tableName,
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

  interface AddNewSnapshotRequest {
    site: string;
    objectStorageKey: string;
    diffObjectStorageKey?: string;
  }
  export const addNewSnapshot = (
    request: AddNewSnapshotRequest
  ): Promise<void> =>
    documentClient
      .get({
        TableName: tableName,
        Key: { PK: request.site, SK: "v0" },
      })
      .promise()
      .then((response) => {
        const latestVersion = response.Item?.Latest || 0;
        const nextVersion = latestVersion + 1;
        const now = Date.now();

        return documentClient
          .transactWrite({
            TransactItems: [
              {
                Update: {
                  Key: { PK: request.site, SK: "v0" },
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
                  TableName: tableName,
                },
              },
              {
                Put: {
                  Item: {
                    PK: request.site,
                    SK: `v${nextVersion}`,
                    DateCreated: now,
                    Type: "Snapshot",
                    ObjectKey: request.objectStorageKey,
                    DiffObjectKey: request.diffObjectStorageKey,
                  },
                  TableName: tableName,
                },
              },
            ],
          })
          .promise();
      })
      .then(() => {
        return;
      });
}
