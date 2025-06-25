export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export const POST = async (request: Request) => {
  // Here you could do any user authorization checks you need for your app
  const endpoint = "https://api.layercode.com/v1/pipelines/authorize_session";
  const apiKey = process.env.LAYERCODE_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server configuration error: LAYERCODE_API_KEY is not set" }, 
      { status: 500 }
    );
  }
  
  const requestBody = await request.json();
  if (!requestBody || !requestBody.pipeline_id) {
    return NextResponse.json(
      { error: "Missing pipeline_id in request body" }, 
      { status: 400 }
    );
  }
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || response.statusText }, 
        { status: response.status }
      );
    }
    
    return NextResponse.json(await response.json());
  } catch (error: any) {
    console.log("Layercode authorize session response error:", error.message);
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}; 