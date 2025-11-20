import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysis } from "../types";

// Helper to convert file to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeFoodImage = async (base64Image: string, mimeType: string): Promise<FoodAnalysis> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Define the strict schema for the AI response
  const analysisSchema = {
    type: Type.OBJECT,
    properties: {
      productName: { type: Type.STRING, description: "The likely name of the product found on the label." },
      healthScore: { type: Type.INTEGER, description: "A health score from 0 (very unhealthy) to 100 (very healthy)." },
      verdict: { 
        type: Type.STRING, 
        enum: ["Excellent", "Good", "Average", "Poor", "Bad"],
        description: "A single word verdict on the overall healthiness."
      },
      summary: { type: Type.STRING, description: "A short paragraph summarizing the analysis in Turkish." },
      pros: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of positive aspects (e.g., High protein, No sugar) in Turkish."
      },
      cons: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of negative aspects (e.g., High sodium, Palm oil) in Turkish."
      },
      additives: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING, description: "E-number if available, or name." },
            name: { type: Type.STRING, description: "Common name of the additive." },
            riskLevel: { type: Type.STRING, enum: ["Safe", "Moderate", "High"] },
            description: { type: Type.STRING, description: "Short description of why it is good or bad in Turkish." }
          },
          required: ["code", "name", "riskLevel", "description"]
        },
        description: "List of potentially notable additives found."
      },
      highlights: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Key highlights like 'High Protein', 'Low Carb' in Turkish."
      },
      isVegetarian: { type: Type.BOOLEAN },
      isGlutenFree: { type: Type.BOOLEAN },
      isPalmOilFree: { type: Type.BOOLEAN },
    },
    required: ["productName", "healthScore", "verdict", "summary", "pros", "cons", "additives", "highlights", "isVegetarian", "isGlutenFree", "isPalmOilFree"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: `
              Analyze this food label or product image. 
              Extract the ingredients list and nutritional values if visible.
              Identify any additives (E-numbers) and assess their health risk.
              Provide a comprehensive health analysis.
              Critically evaluate the product for health benefits and harms.
              IMPORTANT: Respond ONLY with the JSON data matching the schema.
              All text fields (summary, pros, cons, descriptions) MUST be in Turkish Language.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.4, // Lower temperature for more factual analysis
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as FoodAnalysis;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};