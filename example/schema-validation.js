import Schema from '../src/modules/schema';

// BOL Schema, its valid
import bolSchema from '../src/utils/vc/schemas/bol';

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

  try {
    // This method will throw an error as schema is invalid
    await Schema.validateSchema(invalidSchema);
    console.error('Invalid schema passed validation, something went wrong!');
  } catch (e) {
    console.log('Schema validation failed:', e);
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
