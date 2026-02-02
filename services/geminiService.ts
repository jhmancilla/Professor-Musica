import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SongData } from "../types";

export const fetchSongLyrics = async (query: string, customLyrics?: string): Promise<SongData> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct content parts to safely handle user input
  const parts = [];

  if (customLyrics && customLyrics.trim().length > 0) {
     parts.push({ 
       text: `I have a song query: "${query}". The user has provided the EXACT lyrics to use below.
       
       INSTRUCTIONS:
       1. Use the provided "USER_LYRICS" text strictly for the 'lyrics' array. Do not paraphrase.
       2. Just parse the provided text into a JSON array of strings (one string per line).
       3. Based on these lyrics and the query, generate the rest of the metadata (title, artist, vocabulary).
       4. Return ONLY valid JSON.` 
     });
     
     parts.push({ 
       text: `USER_LYRICS:\n${customLyrics}` 
     });
  } else {
     parts.push({
       text: `Find the Spanish lyrics for the song defined by this query: "${query}".
       Return the output in valid JSON format.
       
       Requirements:
       1. 'lyrics': Array of strings, each string is a line. Provide the COMPLETE lyrics. Do not summarize.
       2. 'title': Song title.
       3. 'artist': Artist name.
       
       If the lyrics are not in Spanish originally, find the Spanish version or translation if commonly used in teaching, otherwise provide original.`
     });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using 2.5 Flash as it is highly stable for large context/data extraction
      contents: {
        parts: parts
      },
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
        },
        // Important: Lower safety settings for lyrics as they often contain "unsafe" words in artistic context
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    const text = response.text;
    
    if (!text) {
        // If text is empty, it might be a safety block that wasn't bypassed or a model error
        console.error("Gemini response was empty. Candidates:", response.candidates);
        throw new Error("A IA não retornou dados. Isso pode acontecer se a letra da música violar políticas de conteúdo muito estritas.");
    }

    const data = JSON.parse(text) as SongData;
    return data;

  } catch (error) {
    console.error("Gemini API Error:", error);
    let msg = "Falha ao processar a música. Tente novamente.";
    if (error instanceof Error) {
        msg = error.message;
        if (msg.includes("400")) msg = "Erro na requisição (400). Verifique se a letra não é muito longa.";
        if (msg.includes("429")) msg = "Muitas requisições. Aguarde um momento.";
    }
    throw new Error(msg);
  }
};