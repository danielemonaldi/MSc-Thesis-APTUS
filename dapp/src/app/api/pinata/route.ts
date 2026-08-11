import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    if (!process.env.PINATA_JWT) {
      console.error("CRITICAL ERROR: PINATA_JWT not found in server environment!");
      return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    }

    const contentType = request.headers.get('content-type') || '';
    let pinataRes;

    // Case 1: The frontend is sending a physical file (Image upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const pinataFormData = new FormData();
      pinataFormData.append('file', file);

      pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PINATA_JWT}`,
        },
        body: pinataFormData,
      });

    } else {
      // Case 2: The frontend is sending JSON metadata
      const body = await request.json();

      pinataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
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
    }

    const data = await pinataRes.json();
    
    if (!pinataRes.ok) {
      console.error("❌ Pinata API Error:", JSON.stringify(data, null, 2));
      throw new Error("Pinata rejection error.");
    }

    // Return the IPFS Hash (IpfsHash works for both files and json)
    return NextResponse.json({ ipfsHash: data.IpfsHash }, { status: 200 });

  } catch (error: any) {
    console.error("Server execution error:", error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}