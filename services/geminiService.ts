import { GoogleGenAI, Type } from "@google/genai";
import type { Prescriber, ApiPrescriber, ApiResponse } from '../types';
import { findPrescribersFromDatabase } from './localDataService';

let ai: GoogleGenAI;

// Schema to parse the user's natural language query
const queryParsingSchema = {
  type: Type.OBJECT,
  properties: {
    drug: { type: Type.STRING, description: "The specific medication name the user is asking for." },
    zip: { type: Type.STRING, description: "The 5-digit US ZIP code for the user's desired location." },
    radius: { type: Type.NUMBER, description: "The search radius in miles. Defaults to 25 if not specified." },
  },
  required: ["drug", "zip"],
};

// Schema for the AI to enrich the real data - phone number generation removed.
const enrichmentSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      npi: { type: Type.NUMBER, description: "The original NPI of the prescriber." },
      score: { type: Type.NUMBER, description: "A patient satisfaction score from 1.0 to 5.0, calculated based on specialty relevance and claim volume. Can be a float." },
      focus: { type: Type.STRING, description: "A short, analytical sentence about their prescribing focus, derived from their specialty and high claim count for this drug." },
    },
    required: ["npi", "score", "focus"],
  },
};

const formatAddress = (addr: ApiPrescriber['address']): string => {
    // Clean up ZIP code if it's longer than 5 digits
    const cleanZip = addr.zip.length > 5 ? addr.zip.substring(0, 5) : addr.zip;
    return `${addr.street}, ${addr.city}, ${addr.state} ${cleanZip}`;
};

export const findPrescribers = async (query: string): Promise<Prescriber[]> => {
  try {
    // Initialize AI client if not already done
    if (!ai) {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not found in environment variables');
      }
      ai = new GoogleGenAI({ apiKey });
    }

    // Step 1: Parse the user's natural language query into structured data
    const parsingResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse the user's request to identify the drug and location. Default radius to 25 miles if not specified. User request: "${query}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: queryParsingSchema,
      },
    });
    // Safely extract and parse text from parsing response
    let parsedData: { drug: string; zip: string; radius?: number };
    try {
      const parsingText = parsingResponse.candidates[0].content.parts[0].text;
      parsedData = JSON.parse(parsingText);
    } catch (error) {
      console.error('Error parsing Gemini parsing response:', error);
      throw new Error('Failed to parse drug and location from your request');
    }

    const { drug, zip, radius = 25 } = parsedData;

    // Step 2: Fetch data from local database (much faster than external API)
    const prescribers = await findPrescribersFromDatabase(drug, zip, radius);

    if (!prescribers || prescribers.length === 0) {
      return [];
    }

    // Create a mock ApiResponse structure for compatibility
    const apiData: ApiResponse = {
      prescribers,
      results_count: prescribers.length
    };

    // Step 3: Enrich the real data with AI analysis
    const enrichmentPrompt = `
      You are an AI data analyst for RX Prescribers.
      Given a JSON array of real prescriber data, your task is to analyze and enhance each entry.
      Do NOT invent any information not present in the input (like phone numbers or addresses). Your role is to analyze, not fabricate.
      For each prescriber, generate:
      1. A 'score' (1.0-5.0) strictly based on their specialty and total_claims. Higher claims and a relevant specialty (e.g., Psychiatry for alprazolam) should lead to a higher score. This score represents how strong a match they are.
      2. A compelling 'focus' sentence that summarizes their experience with the drug, referencing their high 'total_claims' and specialty.

      Return ONLY the JSON array with the enrichment fields ('npi', 'score', 'focus') for each prescriber.

      Real data to analyze:
      ${JSON.stringify(apiData.prescribers.map(p => ({npi: p.npi, name: p.name, specialty: p.specialty, total_claims: p.total_claims})))}
    `;

    const enrichmentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: enrichmentPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: enrichmentSchema,
        },
    });

    // Safely extract and parse text from enrichment response
    let enrichedData: { npi: number; score: number; focus: string; }[];
    try {
      const enrichmentText = enrichmentResponse.candidates[0].content.parts[0].text;
      enrichedData = JSON.parse(enrichmentText);
    } catch (error) {
      console.error('Error parsing Gemini enrichment response:', error);
      // Provide default enrichment data if parsing fails
      enrichedData = apiData.prescribers.map(p => ({
        npi: p.npi,
        score: 3.5,
        focus: `Experienced prescriber of ${p.drug.brand_name}.`
      }));
    }

    // Step 4: Merge real data with AI-enriched data
    const enrichmentMap = new Map(enrichedData.map(e => [e.npi, e]));

    const finalPrescribers: Prescriber[] = apiData.prescribers.map(p => {
        const enrichment = enrichmentMap.get(p.npi);
        return {
            name: p.name,
            specialty: p.specialty,
            address: formatAddress(p.address),
            // Phone is no longer generated
            score: enrichment?.score || 3.5,
            focus: enrichment?.focus || `Experienced prescriber of ${p.drug.brand_name}.`,
            total_claims: p.total_claims,
            distance_miles: p.distance_miles,
        };
    });

    // Sort by score descending as a final step
    return finalPrescribers.sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error("Error in RAG service:", error);
    throw new Error("Failed to fetch and process prescriber data.");
  }
};