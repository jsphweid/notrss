import * as AWS from "aws-sdk";
import { Utils } from "../utils";

const mimemessage = require("mimemessage");

export namespace Email {
  const ses = new AWS.SES();

  const emailFrom = process.env.EMAIL_TO_SEND_ALERTS_FROM;

  interface SendSiteRecentlyChangedEmailRequest {
    site: string;
    emails: string[];
    imageUrl: string;
  }

  const structureEmail = (request: SendSiteRecentlyChangedEmailRequest) => {
    const mailContent = mimemessage.factory({
      contentType: "multipart/mixed",
      body: [],
    });
    mailContent.header("From", `NotRSS <${emailFrom}>`);
    mailContent.header(
      "Subject",
      `${
        request.site
      } has recently changed been updated - ${Utils.getNowPrettyFormatted()}`
    );

    const alternateEntity = mimemessage.factory({
      contentType: "multipart/alternate",
      body: [],
    });

    const htmlEntity = mimemessage.factory({
      contentType: "text/html;charset=utf-8",
      body: `
<html>
  <body>
    <p>
      Below highlights where the change took place for <a href="${request.site}">
      ${request.site}</a>...
    </p>
    <img src="${request.imageUrl}" style="max-width: 100%;" />
  </body>
</html>
    `,
    });

    alternateEntity.body.push(htmlEntity);
    mailContent.body.push(alternateEntity);

    return mailContent;
  };

  export const sendSiteRecentlyChangedEmail = (
    request: SendSiteRecentlyChangedEmailRequest
  ) =>
    ses
      .sendRawEmail({
        Destinations: request.emails,
        RawMessage: {
          Data: structureEmail(request).toString(),
        },
      })
      .promise();

  export const assertEmailIsVerified = (email: string): Promise<void> => {
    const strippedEmail = email.replace(/(\.(?=[^@]*?@)|\+[^@]*?(?=@))/, "");
    return ses
      .listVerifiedEmailAddresses()
      .promise()
      .then((response) => {
        if ((response.VerifiedEmailAddresses || []).includes(strippedEmail)) {
          return;
        } else {
          throw new Error(
            "Email `" + email + "` is not a verified email with SES"
          );
        }
      });
  };
}
