import { App } from "@aws-cdk/core";

import { NotRss } from "./stack";

const NUM_HOURS_BETWEEN_COMPARES = process.env.NUM_HOURS_BETWEEN_COMPARES;
const REGION = process.env.REGION;
const EMAIL_ALERTS_FROM = process.env.EMAIL_ALERTS_FROM;

if (!EMAIL_ALERTS_FROM) {
  throw new Error("Need the environment variable `EMAIL_ALERTS_FROM`");
}

const app = new App();

new NotRss.Stack(app, "NotRss", {
  // NOTE: your domain or email address must be setup and verified in SES
  emailAlertsFrom: EMAIL_ALERTS_FROM,
  env: { region: REGION || "us-west-2" },
  numHoursBetweenCompares: NUM_HOURS_BETWEEN_COMPARES
    ? parseInt(NUM_HOURS_BETWEEN_COMPARES, 10)
    : 6,
});

app.synth();
