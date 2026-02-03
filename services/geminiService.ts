import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const getAIRecommendations = async (userQuery: string, currentContext: string): Promise<string> => {
  if (!ai) {
    return "AI service is unavailable. Please check API Key configuration.";
  }

  try {
    const model = 'gemini-3-flash-preview'; // Using recommended flash model for basic text tasks
    const prompt = `
      You are an AI assistant for a streaming service called "My Donkey".
      The user is asking: "${userQuery}".
      Context: The user is currently looking at ${currentContext}.
      
      Suggest 3 fictional or generic movie/show titles that would fit their query.
      Format the response as a bulleted list. Keep descriptions very brief (one sentence).
      Be witty and fun, like a movie buff friend.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Sorry, I couldn't find anything right now.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the movie database (AI).";
  }
};