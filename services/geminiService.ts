import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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
    throw new Error("API Key is missing - Lütfen Vercel ayarlarından GEMINI_API_KEY ekleyin.");
  }

  const genAI = new GoogleGenerativeAI(process.env.API_KEY);

  // JSON Schema definition for the new SDK
  const schema = {
    description: "Food analysis data",
    type: SchemaType.OBJECT,
    properties: {
      productName: { type: SchemaType.STRING, description: "The likely name of the product found on the label." },
      healthScore: { type: SchemaType.NUMBER, description: "A health score from 0 (very unhealthy) to 100 (very healthy)." },
      verdict: { 
        type: SchemaType.STRING, 
        enum: ["Excellent", "Good", "Average", "Poor", "Bad"],
        description: "A single word verdict on the overall healthiness."
      },
      summary: { type: SchemaType.STRING, description: "A short paragraph summarizing the analysis in Turkish." },
      pros: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "List of positive aspects in Turkish."
      },
      cons: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "List of negative aspects in Turkish."
      },
      additives: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            code: { type: SchemaType.STRING },
            name: { type: SchemaType.STRING },
            riskLevel: { type: SchemaType.STRING, enum: ["Safe", "Moderate", "High"] },
            description: { type: SchemaType.STRING }
          },
          required: ["code", "name", "riskLevel", "description"]
        }
      },
      highlights: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Key highlights like 'High Protein', 'Low Carb' in Turkish."
      },
      isVegetarian: { type: SchemaType.BOOLEAN },
      isGlutenFree: { type: SchemaType.BOOLEAN },
      isPalmOilFree: { type: SchemaType.BOOLEAN },
    },
    required: ["productName", "healthScore", "verdict", "summary", "pros", "cons", "additives", "highlights", "isVegetarian", "isGlutenFree", "isPalmOilFree"]
  };

  try {
    // Use the stable 1.5-flash model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      },
      `Analyze this food label or product image. 
       Extract ingredients and nutritional values.
       Identify additives.
       Provide a health analysis in Turkish.
       Respond ONLY with valid JSON matching the schema.`
    ]);

    const text = result.response.text();
    return JSON.parse(text) as FoodAnalysis;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Yapay zeka analizi başarısız oldu. Lütfen tekrar deneyin.");
  }
};
