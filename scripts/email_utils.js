import SESV2 from "aws-sdk/clients/sesv2";
import { curry, identity } from "ramda";
import { envObj, notNilAnd } from "./helpers";

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN,
  AWS_REGION,
} = envObj({
  AWS_ACCESS_KEY_ID: notNilAnd(String),
  AWS_SECRET_ACCESS_KEY: notNilAnd(String),
  AWS_SESSION_TOKEN: identity,
  AWS_REGION: notNilAnd(String),
});

/**
 * Sends an email with the given subject and text body to the supplied addresses.
 *
 * @param {Array<string> | string} toAddr
 * @param {string} subject
 * @param {string} body
 * @returns {Promise}
 */
export const sendAlarmEmailText = curry(async (toAddr, subject, text) =>
 sendAlarmEmailWithBody(toAddr, subject, {
   Text: {
     Data: text,
     Charset: "UTF-8",
   },
 })
);

/**
 * Sends an email with the given subject and html body to the supplied addresses.
 *
 * @param {Array<string> | string} toAddr
 * @param {string} subject
 * @param {string} body
 * @returns {Promise}
 */
export const sendAlarmEmailHtml = curry(async (toAddr, subject, html) =>
  sendAlarmEmailWithBody(toAddr, subject, {
    Html: {
      Data: html,
      Charset: "UTF-8",
    },
  })
);

const sendAlarmEmailWithBody = curry(async (toAddr, subject, body) => {
  const ses = new SESV2({
    apiVersion: "2019-09-27",
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    sessionToken: AWS_SESSION_TOKEN,
    region: AWS_REGION,
  });

  toAddr = Array.isArray(toAddr) ? toAddr : [toAddr];

  const params = {
    Destination: {
      ToAddresses: toAddr,
    },
    Content: {
      Simple: {
        Body: body,
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
      },
    },
    FromEmailAddress: toAddr[0],
  };

  const res = await ses.sendEmail(params).promise();
  console.log("Email sent.");
  console.log(res);

  return res;
});
