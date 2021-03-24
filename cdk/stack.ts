import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import * as targets from "@aws-cdk/aws-events-targets";
import * as lambda from "@aws-cdk/aws-lambda";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as sqs from "@aws-cdk/aws-sqs";
import * as lambdaEventSource from "@aws-cdk/aws-lambda-event-sources";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as apiGateway from "@aws-cdk/aws-apigateway";

import { Duration } from "@aws-cdk/core";

export namespace NotRss {
  interface StackProps extends cdk.StackProps {
    env: { region: string };
    numHoursBetweenCompares: number;
    emailToSendAlertsFrom: string;
  }

  export class Stack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: StackProps) {
      super(scope, id, props);

      // Will essentially store a list of websites to check regularly.
      // Shouldn't use composite key for now; each website URL as primary key
      // should be good enough for now.
      const table = new dynamodb.Table(this, "NotRssTable", {
        partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      });

      // Sparse index so that scan operations don't have to read every single
      // snapshot, instead only the latest
      const DYNAMODB_SPARSE_INDEX_NAME = "GSI1";
      table.addGlobalSecondaryIndex({
        projectionType: dynamodb.ProjectionType.ALL,
        partitionKey: { name: "Latest", type: dynamodb.AttributeType.NUMBER },
        indexName: DYNAMODB_SPARSE_INDEX_NAME,
      });

      // Index that allows the query of email -> subscriptions
      const DYNAMODB_2ND_GSI = "GSI2";
      table.addGlobalSecondaryIndex({
        projectionType: dynamodb.ProjectionType.ALL,
        partitionKey: { name: "SK", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "PK", type: dynamodb.AttributeType.STRING },
        indexName: DYNAMODB_2ND_GSI,
      });

      // Storage for images to compare previous state with current to determine
      const bucket = new s3.Bucket(this, "Bucket", {
        // TODO: this was the easiest way to attach an image but it's bad
        // because it opens up to abuse. Ideally a low quality jpg would be
        // attached instead of a link
        publicReadAccess: true,
      });

      // Queue that will contain individual comparisons to make
      const comparerLambdaTimeout = 120;
      const comparerLambdaRetries = 1;
      const queue = new sqs.Queue(this, "Queue", {
        visibilityTimeout: Duration.seconds(
          comparerLambdaTimeout * (comparerLambdaRetries + 1) * 6
        ),
      });

      // Populates the queue with comparisons to make
      // Is triggered by a Cloudwatch Event Rule on a regular interval
      const messageGeneratorLambda = new lambda.Function(
        this,
        "MessageGeneratorLambda",
        {
          runtime: lambda.Runtime.NODEJS_14_X,
          code: lambda.Code.fromAsset("../build"),
          handler: "message-generator-lambda/index.handler",
          environment: {
            DYNAMODB_SPARSE_INDEX_NAME,
            QUEUE_URL: queue.queueUrl,
            DYNAMODB_TABLE_NAME: table.tableName,
          },
        }
      );

      const rule = new events.Rule(this, "Rule", {
        schedule: events.Schedule.rate(
          cdk.Duration.hours(props.numHoursBetweenCompares)
        ),
      });

      rule.addTarget(new targets.LambdaFunction(messageGeneratorLambda));

      queue.grantSendMessages(messageGeneratorLambda);
      table.grantReadData(messageGeneratorLambda);

      // Actually runs the comparisons and emails if a change has occurred
      // Is triggered from messages on the SQS queue
      const comparerLambda = new lambda.Function(this, "ComparerLambda", {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset("../build"),
        handler: "comparer-lambda/index.handler",
        memorySize: 512,
        timeout: Duration.seconds(comparerLambdaTimeout),
        retryAttempts: comparerLambdaRetries,
        environment: {
          S3_PNG_BUCKET_NAME: bucket.bucketName,
          DYNAMODB_TABLE_NAME: table.tableName,
          QUEUE_URL: queue.queueUrl,
          EMAIL_TO_SEND_ALERTS_FROM: props.emailToSendAlertsFrom,
        },
      });

      table.grantFullAccess(comparerLambda);
      queue.grantConsumeMessages(comparerLambda);
      bucket.grantReadWrite(comparerLambda);
      comparerLambda.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["ses:SendEmail", "SES:SendRawEmail"],
          resources: ["*"],
          effect: iam.Effect.ALLOW,
        })
      );

      const eventSource = comparerLambda.addEventSource(
        new lambdaEventSource.SqsEventSource(queue, { batchSize: 2 })
      );

      // Graphql Lambda that allows one to interact with the DB easier
      const apiLambda = new lambda.Function(this, "ApiLambda", {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset("../build"),
        handler: "api-lambda/index.handler",
        memorySize: 1024,
        timeout: Duration.seconds(20),
        environment: {
          DYNAMODB_2ND_GSI,
          DYNAMODB_TABLE_NAME: table.tableName,
          S3_PNG_BUCKET_NAME: bucket.bucketName,
        },
      });

      table.grantFullAccess(apiLambda);

      new apiGateway.LambdaRestApi(this, "graphqlEndpoint", {
        handler: apiLambda,
      });

      apiLambda.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["ses:ListVerifiedEmailAddresses"],
          resources: ["*"],
          effect: iam.Effect.ALLOW,
        })
      );
    }
  }
}
