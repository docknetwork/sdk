import networkCache from "../utils/network-cache";

// Mock the global fetch function
global.fetch = jest.fn();

// Function to set up a mock response for fetch
const mockFetchResponse = (status, data) => {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-type": "application/json",
    },
  });
  return Promise.resolve(response);
};

export default function mockFetch() {
  // Set up a mock response for all GET requests
  fetch.mockImplementation((url) => {
    if (networkCache[url]) {
      return mockFetchResponse(200, networkCache[url]);
    }

    console.error(`Test should cache this URL: ${url}`);
    throw new Error(`Test should cache this URL: ${url}`);
  });
}
