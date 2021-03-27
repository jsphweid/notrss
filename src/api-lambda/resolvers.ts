import { Resolvers } from "../generated";
import { DB } from "../services/db";
import { Email } from "../services/email";
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
      Email.assertEmailIsVerified(args.email).then(() =>
        DB.subscribeEmailToSites(args).then(() => true)
      ),
  },
  Snapshot: {
    dateCreated: (source) => source.dateCreated.toISOString(),
  },
  SnapshotConnection: {
    totalCount: (source) =>
      source.totalCount || DB.getTotalCountBySite(source.site),
  },
};
