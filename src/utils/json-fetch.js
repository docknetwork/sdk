export class JSONFetchError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
  }
}

export default async function jsonFetch(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (e) {
    throw new Error(`Fetch failed for URL: ${url}`);
  }
  if (response.ok) {
    let doc;
    try {
      doc = await response.json();
    } catch (e) {
      throw new Error(`URL: ${url} is not JSON`);
    }
    return doc;
  } else {
    // Handle the case when the fetch request fails (e.g., non-2xx response status)
    throw new JSONFetchError('Failed to fetch data', response.status);
  }
}
