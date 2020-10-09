jest.mock('axios');
import axios from 'axios';
import networkCache from '../network-cache';

export default function mockAxios() {
  axios.get.mockImplementation(async (url) => {
    if (networkCache[url]) {
      return {
        data: networkCache[url]
      };
    }

    console.error(`Test should cache this URL: ${url}`);
    throw new Error(`Test should cache this URL: ${url}`);
    return undefined;
  });
}
