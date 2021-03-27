import { Utils } from "../../../utils";
import { DBUtils } from "../db-utils";
import { Version } from "../version";

export const _ensureSitesAreBeingWatched = (sites: string[]): Promise<any> =>
  Promise.all(
    Utils.chunkArray(sites, 25).map((chunkOfSites) =>
      DBUtils.documentClient
        .batchGet({
          RequestItems: {
            [DBUtils.tableName]: {
              Keys: chunkOfSites.map((site) => ({
                PK: site,
                SK: Version.CURRENT,
              })),
            },
          },
        })
        .promise()
        .then((response) =>
          (response.Responses?.[DBUtils.tableName] || []).map((item) => item.PK)
        )
        .then((existingSites) =>
          chunkOfSites.filter((site) => !existingSites.includes(site))
        )
        .then((sitesToAdd) => {
          if (sitesToAdd.length) {
            return DBUtils.documentClient
              .batchWrite({
                RequestItems: {
                  [DBUtils.tableName]: sitesToAdd.map((site) => ({
                    PutRequest: {
                      Item: {
                        PK: site,
                        SK: Version.CURRENT,
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
