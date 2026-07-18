import createPlaceholder from './create-placeholder';

const Null = (value) => {
  if (value == null || !String(value).length) {
    return null;
  } else {
    throw new Error(`Unexpected value received: \`${value}\``);
  }
};

export default createPlaceholder(Null);
