/**
 * This is a backend proxy server that forwards requests from the frontend
 * to the external RX Prescribers API. This is necessary to bypass browser
 * CORS (Cross-Origin Resource Sharing) restrictions in a secure manner.
 */
export default async function handler(req: Request): Promise<Response> {
  // Construct a full URL to safely parse path and query parameters.
  // The host is arbitrary as we only need the pathname and search params.
  const url = new URL(req.url, 'http://localhost');

  // Route only requests to /api/prescribers to the proxy logic
  if (url.pathname !== '/api/prescribers') {
    return new Response(JSON.stringify({ error: 'Endpoint not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const drug = url.searchParams.get('drug');
  const zip = url.searchParams.get('zip');
  const radius = url.searchParams.get('radius');

  if (!drug || !zip) {
    return new Response(JSON.stringify({ error: 'Drug and ZIP parameters are required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const externalApiUrl = `https://api.rxprescribers.com/api.php?drug=${encodeURIComponent(drug)}&zip=${encodeURIComponent(zip)}&radius=${radius || 25}`;

  try {
    // Fetch data from the external API.
    const apiResponse = await fetch(externalApiUrl);

    // If the external API returned an error, forward it to the client.
    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      return new Response(errorBody, {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await apiResponse.json();

    // Send the successful response back to the frontend.
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Backend Proxy Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch data from the prescriber API.' }), {
      status: 502, // Bad Gateway
      headers: { 'Content-Type': 'application/json' },
    });
  }
}