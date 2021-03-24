const tsPreset = require("ts-jest/jest-preset");
const dynamodbPreset = require("@shelf/jest-dynamodb/jest-preset");

module.exports = {
  ...tsPreset,
  ...dynamodbPreset,
  testMatch: ["/**/*.test.ts"],
};
