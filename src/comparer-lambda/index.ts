import chromium from "chrome-aws-lambda";
import { SQSHandler } from "aws-lambda";

import { ObjectStorage } from "../services/object-storage";
import { DB } from "../services/db";
import { Queue } from "../services/queue";
import { PNG } from "../services/png";
import { Email } from "../services/email";
import { Utils } from "../utils";

// Simply waiting for the network traffic to stop isn't always enough for sites
// to be fully rendered. Adding additional time for JS and animations to come to a
// stop will generate less fake diffs...
const ADDITIONAL_SLEEP_SECONDS = 20;

const generatePNGFilename = () => `${Utils.generateGUID()}.png`;

export const handler: SQSHandler = async (event, _, callback) => {
  console.log("Handling event...");
  let browser;

  try {
    console.info("Lauching browser...");
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    for (const record of event.Records) {
      const messageData: Queue.MessageData = JSON.parse(record.body);
      console.info("Processing record:", record.messageId, messageData);

      const page = await browser.newPage();

      await page.goto(messageData.site, { waitUntil: "networkidle0" });
      await Utils.sleep(ADDITIONAL_SLEEP_SECONDS);
      const screenshot = await page.screenshot({ fullPage: true });
      const current = await PNG.fromBuffer(screenshot as Buffer);

      const previousScreenshot = messageData.lastSnapshotObjectStorageKey
        ? await ObjectStorage.getItem(messageData.lastSnapshotObjectStorageKey)
        : null;

      const diff =
        previousScreenshot &&
        PNG.getDiff(
          current,
          await PNG.fromBuffer(previousScreenshot as Buffer)
        );

      if (diff || !previousScreenshot) {
        const objectStorageKey = generatePNGFilename();

        console.info("Writing snapshot to ObjectStorage:", objectStorageKey);
        const currentObjectStream = PNG.pack(current);

        if (diff) {
          const diffObjectStream = PNG.pack(diff);
          const diffObjectStorageKey = generatePNGFilename();

          await DB.addNewSnapshot({
            site: messageData.site,
            objectStorageKey,
            diffObjectStorageKey,
          });
          await ObjectStorage.uploadBuffer(
            currentObjectStream,
            objectStorageKey
          );
          await ObjectStorage.uploadBuffer(
            diffObjectStream,
            diffObjectStorageKey
          );

          const emails = await DB.getAllEmailsSubscribedToSite(
            messageData.site
          );
          console.log("Sending emails to:", emails);

          await Email.sendSiteRecentlyChangedEmail({
            emails,
            site: messageData.site,
            imageUrl: ObjectStorage.urlFromKey(diffObjectStorageKey),
          });
        } else {
          // If there was no previous screenshot, save in db/storage,
          // there is no diff, don't notify
          await DB.addNewSnapshot({ site: messageData.site, objectStorageKey });
          await ObjectStorage.uploadBuffer(
            currentObjectStream,
            objectStorageKey
          );
        }
      }

      console.info("Successfully processed record:", record.messageId);
      console.info("Deleting from SQS...");
      await Queue.deleteMessage(record.receiptHandle);
    }
  } catch (error) {
    console.error(error);
    return callback(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return;
};
