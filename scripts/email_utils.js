import SESV2 from "aws-sdk/clients/sesv2";
import { curry } from "ramda";
import { envObj, notNilAnd } from "./helpers";

/**
 * Sends an email with the given subject and body to the supplied addresses.
 *
 * @param {Array<string> | string} toAddr
 * @param {string} subject
 * @param {string} body
 * @returns {Promise}
 */
export const sendAlarmEmail = curry(async (toAddr, subject, body) => {
  const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN,
    AWS_REGION,
  } = envObj({
    AWS_ACCESS_KEY_ID: notNilAnd(String),
    AWS_SECRET_ACCESS_KEY: notNilAnd(String),
    AWS_SESSION_TOKEN: notNilAnd(String),
    AWS_REGION: notNilAnd(String),
  });

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
        Body: {
          Text: {
            Data: body,
            Charset: "UTF-8",
          },
        },
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
      },
    },
    FromEmailAddress: toAddr[0],
  };

  const r = await ses.sendEmail(params).promise();
  console.log("Email sent.");
  console.log(r);

  return r;
});
