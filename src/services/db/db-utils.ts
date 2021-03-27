import * as AWS from "aws-sdk";

export namespace DBUtils {
  export const documentClient = new AWS.DynamoDB.DocumentClient({
    convertEmptyValues: true,
    ...(process.env.JEST_WORKER_ID && {
      endpoint: "localhost:8000",
      sslEnabled: false,
      region: "local-env",
    }),
  });

  export const tableName = process.env.DYNAMODB_TABLE_NAME as string;
  export const sparseIndexName = process.env
    .DYNAMODB_SPARSE_INDEX_NAME as string;
  export const inverseIndexName = process.env.DYNAMODB_2ND_GSI as string;
}
