import { gql } from "apollo-server-lambda";

export const typeDefs = gql`
  type Subscription {
    email: String!
    site: String!
    dateCreated: String!
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
    """
    Subscribes and email to one or more sites. If that isn't being monitored, then it will
    begin to monitor the site. This is currently the only way to begin monitoring a site.
    """
    subscribeEmailToSites(email: String!, sites: [String!]!): Boolean!

    """
    Unsubscribes emails from one or more sites. If there are no other emails subscribed, it'll
    cleanup all related records and objects related to that site.
    """
    unsubscribeEmailFromSites(email: String!, sites: [String!]!): Boolean!
  }
`;
