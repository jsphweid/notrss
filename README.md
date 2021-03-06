# NotRSS

A serverless AWS Stack that allows you to easily monitor websites and get notified when a website changes.

There are products out there that accomplish this but they cost a bit of money. I built this because it didn't seem like a hard problem and costs next to nothing to run.

This was primarily designed for personal use.

## Overview of how it works

A scheduled lambda regularly scans a sparse dynamodb index for a list of sites to compare against previous versions. Using a queue and another lambda, a headless browser navigates to the site and takes a png snapshot. If there is a difference detected, it records the new snapshot and sends you an email with a picture of the diff. A simple GraphQL API is also provided to help manage the database.

## To use

1. clone project and `cd` into it
2. `npm install`
3. run commands below

```bash
npm run build
cd cdk/
npm run build
EMAIL_ALERTS_FROM=noreply@your.verified.ses.domain.com npx cdk deploy
```

3. use GraphQL link created outputed from deploy process and use mutation `subscribeEmailToSites` to subscribe an email to sites

### Restrictions

Currently, only valid emails/domains in your AWS SES work.

### Tips

You can separate emails at your inbox by using the [+ trick](https://www.lifewire.com/easy-gmail-address-hacks-1616186). This works well with SES validated identities.

# TODO

Make a DL queue with alarm...
