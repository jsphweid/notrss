import { ApolloServer } from "apollo-server-lambda";
import { APIGatewayProxyHandler } from "aws-lambda";

import { resolvers } from "./resolvers";
import { typeDefs } from "./type-defs";

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
