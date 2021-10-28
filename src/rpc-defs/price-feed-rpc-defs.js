export default {
  price_feed: {
    tokenUsdPrice: {
      description: "Gets the price of Dock/USD from pallet's storage",
      params: [],
      type: 'Option<u32>',
    },
    tokenUsdPriceFromContract: {
      description: 'Gets the price of Dock/USD from EVM contract',
      params: [],
      type: 'Option<u32>',
    },
  },
};
