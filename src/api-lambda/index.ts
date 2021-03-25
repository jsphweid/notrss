import { ApolloServer, gql } from "apollo-server-lambda";
import { APIGatewayProxyHandler } from "aws-lambda";

import { Resolvers } from "../generated";
import { DB } from "../services/db";
import { Email } from "../services/email";
import { ObjectStorage } from "../services/object-storage";
import { SnapshotMapper } from "./mappers";

const typeDefs = gql`
  type Subscription {
    email: String!
    site: String!
    dateCreated: String! # should probably be a DateTime scalar
  }

  type PageInfo {
    startCursor: String
    endCursor: String
    hasPreviousPage: Boolean!
    hasNextPage: Boolean!
  }

  type SnapshotConnection {
    pageInfo: PageInfo!
    edges: [SnapshotEdge!]!
  }

  type SnapshotEdge {
    cursor: String!
    node: Snapshot!
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
    getSnapshots(
      site: String!
      first: Int
      after: String
      last: Int
      before: String
    ): SnapshotConnection!
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
      DB.getSnapshots(args.site, {
        first: args.first,
        after: args.after,
        last: args.last,
        before: args.before,
      }).then((result) => ({
        pageInfo: result.pageInfo,
        edges: result.edges.map((edge) => ({
          cursor: edge.cursor,
          node: {
            ...edge.node,
            dateCreated: edge.node.dateCreated.toISOString(),
            objectStorageUrl: ObjectStorage.urlFromKey(
              edge.node.objectStorageKey
            ),
            diffObjectStorageUrl: edge.node.diffObjectStorageKey
              ? ObjectStorage.urlFromKey(edge.node.diffObjectStorageKey)
              : null,
          },
        })),
      })),
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
