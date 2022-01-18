import SESV2 from "aws-sdk/clients/sesv2";
import { curry } from "ramda";

/**
 * Sends an email with the given subject and body to the supplied addresses.
 *
 * @param {Array<string> | string} toAddr
 * @param {string} subject
 * @param {string} body
 * @returns {Promise}
 */
export const sendAlarmEmail = curry(async (toAddr, subject, body) => {
  const ses = new SESV2({
    apiVersion: "2019-09-27",
    accessKeyId: process.env.AwsAccessId,
    secretAccessKey: process.env.AwsSecretKey,
    region: process.env.AwsSesEmailRegion,
  });

  const params = {
    Destination: {
      ToAddresses: Array.isArray(toAddr) ? toAddr : [toAddr],
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
    FromEmailAddress: process.env.AlarmEmailTo,
  };

  const r = await ses.sendEmail(params).promise();
  console.log("Email sent.");
  console.log(r);
  
  return r;
});
