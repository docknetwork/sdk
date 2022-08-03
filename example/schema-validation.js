import Schema from '../src/modules/schema';

// BOL Schema, its valid
import bolSchema from './schemas/bol';

// Invalid example schema
const invalidSchema = {
  invalid: true,
};

async function main() {
  // Run validation for example BOL schema
  console.log('Example schema should be valid:', bolSchema);

  // This method would throw an error if its invalid
  await Schema.validateSchema(bolSchema);

  // Run validation for invalid schema
  console.log('Example schema should be invalid:', invalidSchema);

  let success = false;
  try {
    // This method will throw an error as schema is invalid
    await Schema.validateSchema(invalidSchema);
  } catch (e) {
    success = true;
    console.log('As expected, schema validation failed with error:', e);
  }

  if (success === false) {
    throw new Error('Invalid schema passed validation, something went wrong!');
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
