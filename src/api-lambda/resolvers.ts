import { Resolvers } from "../generated";
import { DB } from "../services/db";
import { Email } from "../services/email";
import { ObjectStorage } from "../services/object-storage";
import { Queue } from "../services/queue";
import { Utils } from "../utils";
import { OptimizationHelpers } from "./optimization-helpers";

export const resolvers: Resolvers = {
  Query: {
    getEmailsSubscribedToSite: (_, args) =>
      DB.getAllEmailsSubscribedToSite(args.site),
    getSubscriptionsByEmail: (_, args) =>
      DB.getSubscriptionsByEmail(args.email),
    getSnapshots: (_, args, __, info) =>
      DB.getSnapshots(args.site, {
        first: args.first,
        after: args.after,
        last: args.last,
        before: args.before,
        includeTotalCount: OptimizationHelpers.totalCountBeingRequested(info),
      }),
  },
  Mutation: {
    subscribeEmailToSites: (_, args) =>
      Email.assertEmailIsVerified(args.email)
        .then(() => DB.subscribeEmailToSites(args))
        .then(() => Queue.writeMessages(args.sites.map((site) => ({ site }))))
        .then(() => true),
    unsubscribeEmailFromSites: (_, args) =>
      DB.unsubscribeEmailFromSites(args)
        .then(() =>
          Promise.all(args.sites.map(DB.getAllEmailsSubscribedToSite))
        )
        .then((results) =>
          results // grabs sites that have no one else subscribed
            .map((emails, i) => (emails.length ? null : args.sites[i]))
            .filter(Utils.isTruthy)
        )
        // NOTE: items will be deleted from ObjectStorage in DynamoDB stream
        .then(DB.deleteSites)
        .then(() => true),
  },
  Snapshot: {
    dateCreated: (source) => source.dateCreated.toISOString(),
    objectStorageUrl: (source) =>
      ObjectStorage.urlFromKey(source.objectStorageKey),
    diffObjectStorageUrl: (source) =>
      source.diffObjectStorageKey
        ? ObjectStorage.urlFromKey(source.diffObjectStorageKey)
        : null,
  },
  SnapshotConnection: {
    totalCount: (source) =>
      source.totalCount || DB.getTotalCountBySite(source.site),
  },
};
