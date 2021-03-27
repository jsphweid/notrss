import { Utils } from "../../../utils";
import { DBUtils } from "../db-utils";
import { DB } from "..";

export const _subscribeEmailToSites = (request: {
  email: string;
  sites: string[];
}): Promise<any> =>
  DB.ensureSitesAreBeingWatched(request.sites).then(() =>
    Promise.all(
      Utils.chunkArray(request.sites, 25).map((chunkOfSites) =>
        DBUtils.documentClient
          .batchWrite({
            RequestItems: {
              [DBUtils.tableName]: chunkOfSites.map((site) => ({
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
