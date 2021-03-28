import * as AWS from "aws-sdk";
import { Utils } from "../utils";

const s3Client = new AWS.S3();

export namespace ObjectStorage {
  const bucketName = process.env.S3_PNG_BUCKET_NAME as string;
  const region = process.env.AWS_REGION as string;

  export const uploadBuffer = (body: AWS.S3.Body, key: string): Promise<any> =>
    s3Client
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: "image/png",
      })
      .promise();

  export const getItem = (objectKey: string): Promise<AWS.S3.Body | null> =>
    s3Client
      .getObject({
        Bucket: bucketName,
        Key: objectKey,
      })
      .promise()
      .then((response) => response.Body || null);

  export const deleteKeys = (keys: string[]): Promise<any> =>
    Promise.all(
      Utils.chunkArray(keys, 1000).map((batch) =>
        s3Client
          .deleteObjects({
            Delete: { Objects: batch.map((key) => ({ Key: key })) },
            Bucket: bucketName,
          })
          .promise()
      )
    );

  export const urlFromKey = (objectKey: string): string =>
    // TODO: eventually this should not exist as it relies on the item
    // being public which is bad
    `https://${bucketName}.s3-${region}.amazonaws.com/${objectKey}`;
}
