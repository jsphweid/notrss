import { ApolloServer, gql } from "apollo-server-lambda";
import { APIGatewayProxyHandler } from "aws-lambda";

import { Resolvers } from "../generated";
import { DB } from "../services/db";
import { Email } from "../services/email";
import { ObjectStorage } from "../services/object-storage";

const typeDefs = gql`
  type Subscription {
    email: String!
    site: String!
    dateCreated: String! # should probably be a DateTime scalar
  }

  type Snapshot {
    dateCreated: String!
    site: String!
    version: Int!
    objectStorageUrl: String!
    diffObjectStorageUrl: String
  }

  type Query {
    getEmailsSubscribedToSite(site: String!): [String!]!
    getSubscriptionsByEmail(email: String!): [Subscription!]!
    getSnapshots(site: String!): [Snapshot!]!
  }

  type Mutation {
    subscribeEmailToSites(email: String!, sites: [String!]!): Boolean!
  }
`;

const resolvers: Resolvers = {
  Query: {
    getEmailsSubscribedToSite: (_, args) =>
      DB.getAllEmailsSubscribedToSite(args.site),
    getSubscriptionsByEmail: (_, args) =>
      DB.getSubscriptionsByEmail(args.email),
    getSnapshots: (_, args) =>
      DB.getSnapshots(args.site).then((snapshots) =>
        snapshots.map((s) => ({
          ...s,
          dateCreated: s.dateCreated.toISOString(),
          objectStorageUrl: ObjectStorage.urlFromKey(s.objectStorageKey),
          diffObjectStorageUrl: s.diffObjectStorageKey
            ? ObjectStorage.urlFromKey(s.diffObjectStorageKey)
            : null,
        }))
      ),
  },
  Mutation: {
    subscribeEmailToSites: (_, args) =>
      Email.assertEmailIsVerified(args.email).then(() =>
        DB.subscribeEmailToSites(args).then(() => true)
      ),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

export const handler: APIGatewayProxyHandler = (
  event,
  lambdaContext,
  callback
) => {
  // Playground handler
  if (event.httpMethod === "GET") {
    server.createHandler()(
      { ...event, path: event.requestContext.path || event.path },
      lambdaContext,
      callback
    );
  } else {
    server.createHandler()(event, lambdaContext, callback);
  }
};
