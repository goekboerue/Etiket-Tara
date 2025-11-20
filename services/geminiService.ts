import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { FoodAnalysis } from "../types";

// Helper to convert file to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeFoodImage = async (base64Image: string, mimeType: string): Promise<FoodAnalysis> => {
  // DEĞİŞİKLİK BURADA: process.env yerine import.meta.env kullandık
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key eksik! Lütfen Vercel ayarlarında VITE_GEMINI_API_KEY tanımlayın.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const schema = {
    description: "Food analysis data",
    type: SchemaType.OBJECT,
    properties: {
      productName: { type: SchemaType.STRING, description: "Product name" },
      healthScore: { type: SchemaType.NUMBER, description: "0-100 score" },
      verdict: { 
        type: SchemaType.STRING, 
        enum: ["Excellent", "Good", "Average", "Poor", "Bad"],
        description: "Verdict"
      },
      summary: { type: SchemaType.STRING, description: "Turkish summary" },
      pros: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Pros in Turkish"
      },
      cons: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Cons in Turkish"
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
        description: "Highlights in Turkish"
      },
      isVegetarian: { type: SchemaType.BOOLEAN },
      isGlutenFree: { type: SchemaType.BOOLEAN },
      isPalmOilFree: { type: SchemaType.BOOLEAN },
    },
    required: ["productName", "healthScore", "verdict", "summary", "pros", "cons", "additives", "highlights", "isVegetarian", "isGlutenFree", "isPalmOilFree"]
  };

  try {
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
      `Analyze this food label. Provide output in Turkish where requested. Respond ONLY with JSON.`
    ]);

    const text = result.response.text();
    return JSON.parse(text) as FoodAnalysis;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Hata mesajını daha anlaşılır hale getirelim
    throw new Error("Bağlantı hatası! Lütfen reklam engelleyicinizi kapatıp tekrar deneyin.");
  }
};
