import { DynamoDBStreamHandler } from "aws-lambda";
import { ObjectStorage } from "../services/object-storage";
import { Utils } from "../utils";

export const handler: DynamoDBStreamHandler = async (event) => {
  const keysToMaybeDelete: Array<string | undefined> = [];
  for (const record of event.Records) {
    if (
      record.eventName === "REMOVE" &&
      record.dynamodb?.OldImage?.Type?.S === "Snapshot"
    ) {
      keysToMaybeDelete.push(record.dynamodb?.OldImage?.ObjectKey?.S);
      keysToMaybeDelete.push(record.dynamodb?.OldImage?.DiffObjectKey?.S);
    }
  }
  await ObjectStorage.deleteKeys(keysToMaybeDelete.filter(Utils.isTruthy));
};
