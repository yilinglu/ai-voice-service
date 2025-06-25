// Layercode Voice Agent Backend Next.js Example
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { streamResponse } from "@layercode/node-server-sdk";

export const POST = async (request) => {
  const google = createGoogleGenerativeAI();
  const requestBody = await request.json();
  const text = requestBody.text;

  return streamResponse(requestBody, async ({ stream }) => {
    if (requestBody.type === "message") {
      const { textStream } = streamText({
        model: google("gemini-2.0-flash-001"),
        system: "You are a helpful voice assistant.",
        messages: [{ role: "user", content: text }],
        onFinish: () => {
          stream.end();
        },
      });
      await stream.ttsTextStream(textStream);
    }
  });
};
