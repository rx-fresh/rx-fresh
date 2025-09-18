/**
 * Vercel API route that proxies requests to the RX Prescribers API
 * This handles CORS and allows the frontend to make requests
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { drug, zip, radius = '25' } = req.query;

  // Validate required parameters
  if (!drug || !zip) {
    return res.status(400).json({ error: 'Drug and ZIP parameters are required.' });
  }

  // Construct the external API URL
  const externalApiUrl = `https://api.rxprescribers.com/api.php?drug=${encodeURIComponent(drug as string)}&zip=${encodeURIComponent(zip as string)}&radius=${radius}`;

  try {
    // Fetch data from the external API
    const apiResponse = await fetch(externalApiUrl);

    // If the external API returned an error, forward it to the client
    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      return res.status(apiResponse.status).json({ error: errorBody });
    }

    const data = await apiResponse.json();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Send the successful response back to the frontend
    return res.status(200).json(data);

  } catch (error) {
    console.error('API Proxy Error:', error);
    return res.status(502).json({ error: 'Failed to fetch data from the prescriber API.' });
  }
}
