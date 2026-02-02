import { GoogleGenAI, Type } from "@google/genai";
import { SongData } from "../types";

// Note: Using the new SDK syntax as requested.
// API Key is assumed to be in process.env.API_KEY

export const fetchSongLyrics = async (query: string, customLyrics?: string): Promise<SongData> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let prompt = '';

  if (customLyrics && customLyrics.trim().length > 0) {
     // User provided lyrics. Strict mode.
     prompt = `
        I have a song query: "${query}".
        
        CRITICAL: The user has provided the EXACT lyrics to use below. 
        1. Use the provided "Raw Lyrics" text strictly for the 'lyrics' array. Do not paraphrase, summarize, or change the words.
        2. Just parse the provided text into a JSON array of strings (one string per line).
        3. Based on these lyrics and the query, generate the rest of the metadata (title, artist, vocabulary).
        
        Raw Lyrics provided by user:
        """
        ${customLyrics}
        """

        Return the output in valid JSON format matching the schema.
     `;
  } else {
     // Standard mode
     prompt = `
        Find the Spanish lyrics for the song defined by this query: "${query}".
        Return the output in valid JSON format.
        
        Requirements:
        1. 'lyrics': Array of strings, each string is a line. Provide the COMPLETE lyrics. Do not summarize.
        2. 'title': Song title.
        3. 'artist': Artist name.
        
        If the lyrics are not in Spanish originally, find the Spanish version or translation if commonly used in teaching, otherwise provide original. 
      `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
            lyrics: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            vocabulary: {
                type: Type.ARRAY,
                description: "List of 5-10 difficult or interesting Spanish words found in the lyrics with their translations.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        translation: { type: Type.STRING }
                    },
                    required: ["word", "translation"]
                }
            }
          },
          required: ['title', 'artist', 'lyrics']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data received from Gemini.");

    const data = JSON.parse(text) as SongData;
    return data;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to fetch lyrics. Please try again.");
  }
};