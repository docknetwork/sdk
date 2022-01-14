import SESV2 from "aws-sdk/clients/sesv2";

export async function sendAlarmEmail(subject, body) {
  const ses = new SESV2({
    apiVersion: "2019-09-27",
    accessKeyId: process.env.AwsAccessId,
    secretAccessKey: process.env.AwsSecretKey,
    region: process.env.AwsSesEmailRegion,
  });

  // Split comma separated list of email recipients
  const toAddr = process.env.AlarmEmailTo.split(",");
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
    FromEmailAddress: process.env.AlarmEmailTo,
  };

  const r = await ses.sendEmail(params).promise();
  console.log("Email sent.");
  console.log(r);
  return r;
}
