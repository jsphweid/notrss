import * as AWS from "aws-sdk";
import { Utils } from "../utils";

AWS.config.region = "us-west-2";

import { DB } from "./db";

const documentClient = new AWS.DynamoDB.DocumentClient({
  endpoint: "localhost:8000",
  sslEnabled: false,
  region: "local-env",
});
const tableName = process.env.DYNAMODB_TABLE_NAME as string;

const clearTable = async () => {
  let items: any[] = [];
  const scan = async (startKey?: AWS.DynamoDB.Key) => {
    const response = await documentClient
      .scan({
        TableName: tableName,
        ExclusiveStartKey: startKey,
      })
      .promise();
    response.Items?.forEach((item) => {
      items.push(item);
    });
    if (typeof response.LastEvaluatedKey !== "undefined") {
      await scan(response.LastEvaluatedKey);
    }
  };
  await scan();

  const chunks = Utils.chunkArray(items, 25);
  for (const chunk of chunks) {
    await documentClient
      .batchWrite({
        RequestItems: {
          [tableName]: chunk.map((item) => ({
            DeleteRequest: {
              Key: { PK: item.PK, SK: item.SK },
            },
          })),
        },
      })
      .promise();
  }
};

describe("DB tests", () => {
  afterEach(async () => {
    await clearTable();
  });

  test("bumps versions such that getAllLatestItems only gets two items", async () => {
    await DB.addNewSnapshot({ objectStorageKey: "1", site: "a.com" });
    await DB.addNewSnapshot({ objectStorageKey: "2", site: "a.com" });
    await DB.addNewSnapshot({ objectStorageKey: "3", site: "b.com" });

    const items = await DB.getAllLatestItems();
    expect(items.length).toBe(2);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectStorageKey: "3",
          site: "b.com",
          latestVersionNumber: 1,
        }),
        expect.objectContaining({
          objectStorageKey: "2",
          site: "a.com",
          latestVersionNumber: 2,
        }),
      ])
    );
  });

  test("ensureSitesAreBeingWatched adds sites currently not being watched", async () => {
    // initially nothing to process...
    expect((await DB.getAllLatestItems()).length).toBe(0);

    // but when a site is added...
    await DB.ensureSitesAreBeingWatched(["something.com"]);

    // should find it
    const items = await DB.getAllLatestItems();
    expect(items.length).toBe(1);
    expect(items[0]).toEqual(
      expect.objectContaining({ site: "something.com", latestVersionNumber: 0 })
    );
  });

  test("subscribeEmailToSites subscribes users to sites", async () => {
    await DB.addNewSnapshot({ objectStorageKey: "1", site: "a.com" });
    await DB.addNewSnapshot({ objectStorageKey: "2", site: "b.com" });

    expect((await DB.getAllEmailsSubscribedToSite("a.com")).length).toBe(0);
    expect((await DB.getAllEmailsSubscribedToSite("b.com")).length).toBe(0);

    await DB.subscribeEmailToSites({
      email: "some@one.com",
      sites: ["a.com", "b.com"],
    });

    expect(await DB.getAllEmailsSubscribedToSite("a.com")).toEqual([
      "some@one.com",
    ]);
    expect(await DB.getAllEmailsSubscribedToSite("b.com")).toEqual([
      "some@one.com",
    ]);
  });

  test("subscribeEmailToSites will add sites if necessary", async () => {
    await DB.addNewSnapshot({ objectStorageKey: "1", site: "a.com" });

    expect((await DB.getAllLatestItems()).length).toBe(1);

    await DB.subscribeEmailToSites({
      email: "some@one.com",
      sites: ["a.com", "b.com"],
    });

    expect((await DB.getAllLatestItems()).length).toBe(2);

    expect(await DB.getAllEmailsSubscribedToSite("b.com")).toEqual([
      "some@one.com",
    ]);
  });

  test("getSubscriptionsByEmail works", async () => {
    const email = "some@one.com";
    await DB.subscribeEmailToSites({
      email,
      sites: ["a.com", "b.com"],
    });

    const sites = await DB.getSubscriptionsByEmail("some@one.com");

    expect(sites.length).toBe(2);
    expect(sites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email,
          site: "b.com",
        }),
        expect.objectContaining({
          email,
          site: "a.com",
        }),
      ])
    );
  });

  test("getSnapshots works", async () => {
    await DB.addNewSnapshot({ objectStorageKey: "1", site: "a.com" });
    await DB.addNewSnapshot({
      objectStorageKey: "2",
      site: "a.com",
      diffObjectStorageKey: "2a",
    });
    await DB.addNewSnapshot({ objectStorageKey: "3", site: "b.com" }); // should ignore
    await DB.addNewSnapshot({
      objectStorageKey: "3",
      site: "a.com",
      diffObjectStorageKey: "3a",
    });

    const snapshots = await DB.getSnapshots("a.com");
    expect(snapshots.length).toBe(3);
    expect(snapshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          version: 1,
          site: "a.com",
          objectStorageKey: "1",
          diffObjectStorageKey: null,
        }),
        expect.objectContaining({
          version: 2,
          site: "a.com",
          objectStorageKey: "2",
          diffObjectStorageKey: "2a",
        }),
        expect.objectContaining({
          version: 3,
          site: "a.com",
          objectStorageKey: "3",
          diffObjectStorageKey: "3a",
        }),
      ])
    );
  });
});
