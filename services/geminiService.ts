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

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeFoodImage = async (base64Image: string, mimeType: string): Promise<FoodAnalysis> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Define the strict schema for the AI response
  const analysisSchema = {
    type: Type.OBJECT,
    properties: {
      productName: { type: Type.STRING, description: "The identified name of the product. If brand is hidden, use the product category (e.g. 'Orange Juice')." },
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
      alternatives: {
        type: Type.ARRAY,
        items: { 
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: "Name of a healthier alternative product." },
            reason: { type: Type.STRING, description: "Why this alternative is better (e.g. 'Less sugar', 'Whole grain'). In Turkish." }
          }
        },
        description: "If healthScore < 60, list 2-3 healthier generic product alternatives. If healthy, leave empty."
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

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
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
                Analyze this image for food health purposes. The image might contain a Nutrition Label, Ingredients List, Product Front Packaging, or a QR Code/Barcode.

                Instructions:
                1. **Identify the Product**: 
                   - Look for the brand name and product name text.
                   - **CRITICAL**: If you see a **QR Code** or **Barcode**, try to "read" it visually or use the numbers/pattern to identify the specific product.
                   - If no text/brand is visible, identify the product by its visual appearance.
                
                2. **Analyze Health**:
                   - Extract ingredients and nutritional values if visible.
                   - Identify additives (E-numbers).
                   - **Contextual Analysis**: If the text is blurry or missing, but you identified the product, use your internal knowledge about that specific product type to estimate the health score, pros, and cons.
                
                3. **Suggest Alternatives**:
                   - **IF the calculated health score is below 60 (Average, Poor, or Bad)**: Suggest 2-3 healthier alternatives. 
                   - These should be generic product types or common healthy variations (e.g., "If analyzing sugary soda -> Suggest Sparkling Water with Fruit").
                   - Do NOT output specific brand URLs.
                
                4. **Output**:
                   - Provide a comprehensive health analysis (Benefits vs Harms).
                   - Calculate a health score (0-100).
                   - IMPORTANT: Respond ONLY with the JSON data matching the schema.
                   - All text fields (summary, pros, cons, descriptions, alternatives) MUST be in Turkish Language.
              `
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          temperature: 0.4, 
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      return JSON.parse(text) as FoodAnalysis;

    } catch (error: any) {
      // Check if error is 503 Service Unavailable or Overloaded
      const isOverloaded = 
        error.message?.includes("503") || 
        error.message?.includes("overloaded") ||
        error.status === 503;

      if (isOverloaded && attempts < maxAttempts - 1) {
        console.warn(`Gemini Model Overloaded. Retrying in ${(attempts + 1) * 2} seconds...`);
        await delay(2000 * (attempts + 1)); // Wait 2s, then 4s
        attempts++;
        continue;
      }
      
      console.error("Gemini Analysis Error:", error);
      throw error;
    }
  }
  
  throw new Error("Sunucu yoğunluğu nedeniyle işlem tamamlanamadı. Lütfen tekrar deneyin.");
};