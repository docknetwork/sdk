/*
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
*/
'use strict';

const axios = require('axios');
const testContext = require('../vc-helpers/contexts');

module.exports = async url => {
  const context = testContext.get(url);
  if(context) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: context
    };
  }
  const {data: document} = await axios.get(url);
  return {
    contextUrl: null,
    document,
    documentUrl: url,
  };
};
