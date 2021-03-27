import { gql } from "apollo-server-lambda";

export const typeDefs = gql`
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
    totalCount: Int!
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
