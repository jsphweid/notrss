import * as AWS from "aws-sdk";

import { Utils } from "../utils";

// for some reason is necssary
AWS.config.update({ region: process.env.AWS_REGION as string });

const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

export namespace Queue {
  const queueUrl = process.env.QUEUE_URL as string;

  export interface MessageData {
    lastSnapshotObjectStorageKey: string | null;
    site: string;
  }

  // NOTE: ideally this isn't dependent on AWS's SQS...
  interface WriteMessagesResponse {
    successes: AWS.SQS.SendMessageBatchResultEntryList;
    failures: AWS.SQS.BatchResultErrorEntryList;
  }
  export const writeMessages = (
    items: MessageData[]
  ): Promise<WriteMessagesResponse> => {
    const chunks = Utils.chunkArray(items, 10);
    const ret: WriteMessagesResponse = { successes: [], failures: [] };
    return Promise.all(
      chunks.map((chunk) =>
        sqs
          .sendMessageBatch({
            QueueUrl: queueUrl,
            Entries: chunk.map((item) => ({
              Id: Utils.generateGUID(),
              MessageBody: JSON.stringify(item),
            })),
          })
          .promise()
          .then((response) => {
            response.Failed.forEach((fail) => ret.failures.push(fail));
            response.Successful.forEach((success) =>
              ret.successes.push(success)
            );
          })
      )
    ).then(() => ret);
  };

  export const deleteMessage = (receiptHandle: string): Promise<any> =>
    sqs
      .deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      })
      .promise();
}
