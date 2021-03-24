process.env.DYNAMODB_TABLE_NAME = "NotRSSTestTable";
process.env.DYNAMODB_SPARSE_INDEX_NAME = "GSI1";
process.env.DYNAMODB_2ND_GSI = "GSI2";

module.exports = {
  tables: [
    {
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
        { AttributeName: "Latest", AttributeType: "N" },
      ],
      TableName: "NotRSSTestTable",
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [{ AttributeName: "Latest", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
        {
          IndexName: "GSI2",
          KeySchema: [
            { AttributeName: "SK", KeyType: "HASH" },
            { AttributeName: "PK", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
    },
  ],
};
