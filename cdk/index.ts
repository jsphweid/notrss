import { App } from "@aws-cdk/core";

import { NotRss } from "./stack";

const app = new App();

new NotRss.Stack(app, "NotRss", {
  env: { region: "us-west-2" },
  numHoursBetweenCompares: 6,

  // NOTE: your domain or email address must be setup and verified in SES
  // TODO: why can't I send to other emails though (only ones verified from SES)
  emailToSendAlertsFrom: "noreply@josephweidinger.com",
});

app.synth();
