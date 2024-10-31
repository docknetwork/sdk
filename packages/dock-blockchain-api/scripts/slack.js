import { curry } from "ramda";
import fetch from "node-fetch";

export const TYPES = {
  WARNING: "warning",
  DANGER: "danger",
  SUCCESS: "success",
};

/**
 * Posts a message to Slack.
 */
export const postMessage = curry(async (url, type, header, fields) => {
  const body = Buffer.from(
    JSON.stringify({
      text: header,
      attachments: [
        {
          color: type,
          fields,
          ts: new Date().getTime() / 1e3,
        },
      ],
    })
  );
  const headers = {
    "Content-Type": "application/json",
    "Content-Length": body.byteLength,
  };

  return await fetch(url, {
    headers,
    method: "POST",
    body,
  });
});
