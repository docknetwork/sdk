export default {
  $schema: "http://json-schema.org/draft-07/schema#",
  description: "Alumni",
  type: "object",
  properties: {
    id: {
      type: "string",
    },
    emailAddress: {
      type: "string",
      format: "email",
    },
    alumniOf: {
      type: "string",
    },
  },
  required: ["emailAddress", "alumniOf"],
  additionalProperties: false,
};
