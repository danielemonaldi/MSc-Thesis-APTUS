import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Security check: ensure the PINATA_JWT environment variable is properly loaded
    if (!process.env.PINATA_JWT) {
      console.error("CRITICAL ERROR: PINATA_JWT not found. Please check your .env.local file!");
      return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    }

    // Pin the metadata JSON to IPFS via Pinata's API
    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: body,
        pinataMetadata: { name: `APTUS_Metadata_${Date.now()}.json` }
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      // 2. If the request fails, log the exact error details to the server terminal for debugging
      console.error("❌ Pinata rejected the request. Details:", JSON.stringify(data, null, 2));
      throw new Error("Pinata API Error. Check the server terminal for more details.");
    }

    // Return the generated IPFS Hash (CID) to the frontend
    return NextResponse.json({ ipfsHash: data.IpfsHash }, { status: 200 });
  } catch (error: any) {
    console.error("Server execution error:", error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}