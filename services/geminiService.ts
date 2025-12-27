
import { GoogleGenAI, Modality } from "@google/genai";
import { SearchResponse, SearchResult } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  async refineQuery(originalQuery: string, currentSummary: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user previously searched for: "${originalQuery}". 
      The summary provided was: "${currentSummary}".
      Generate a more specific and detailed search query that would help the user dive deeper into this topic. 
      Return only the new search query text, nothing else.`,
      config: {
        temperature: 0.7,
      },
    });

    return response.text?.trim() || `${originalQuery} in detail`;
  }

  async searchAndSummarize(query: string): Promise<SearchResponse> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Perform a Google Search to answer this query: "${query}". 
      First, provide a clear, concise summary of the results in 3 sentences. 
      Second, explicitly state what specific search query you used to find this information at the very end of your response, prefixed with "QUERY_USED: ".`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    const fullText = response.text || "";
    let summary = fullText;
    let actualQuery = query;

    // Extract the internal query used if possible
    const queryMatch = fullText.match(/QUERY_USED:\s*(.*)/i);
    if (queryMatch) {
      actualQuery = queryMatch[1].trim();
      summary = fullText.replace(/QUERY_USED:\s*.*$/i, '').trim();
    }

    const sources: SearchResult[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          sources.push({
            title: chunk.web.title || "Source",
            uri: chunk.web.uri
          });
        }
      });
    }

    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);

    return { 
      summary, 
      sources: uniqueSources,
      actualQuery 
    };
  }

  async generateSpeech(text: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this search summary clearly and naturally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("Audio generation failed.");
    return audioData;
  }
}
