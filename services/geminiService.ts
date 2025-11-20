import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { FoodAnalysis } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Resmi çok küçültmeyelim ki okunabilsin, ama çok da büyük olmasın
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas hatası"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Kaliteyi biraz artırdık (0.8)
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = () => reject(new Error("Resim yüklenemedi"));
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeFoodImage = async (base64Image: string, mimeType: string): Promise<FoodAnalysis> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("API Anahtarı Eksik! Vercel ayarlarını kontrol edin.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const schema = {
    description: "Gıda analiz sonucu",
    type: SchemaType.OBJECT,
    properties: {
      productName: { type: SchemaType.STRING, description: "Ürün adı" },
      healthScore: { type: SchemaType.NUMBER, description: "0-100 sağlık puanı" },
      verdict: { 
        type: SchemaType.STRING, 
        enum: ["Excellent", "Good", "Average", "Poor", "Bad"],
        description: "Karar"
      },
      summary: { type: SchemaType.STRING, description: "Türkçe özet" },
      pros: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      cons: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
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
      highlights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      isVegetarian: { type: SchemaType.BOOLEAN },
      isGlutenFree: { type: SchemaType.BOOLEAN },
      isPalmOilFree: { type: SchemaType.BOOLEAN },
    },
    required: ["productName", "healthScore", "verdict", "summary", "pros", "cons", "additives", "highlights", "isVegetarian", "isGlutenFree", "isPalmOilFree"]
  };

  try {
    const model = genAI.getGenerativeModel({
      // DEĞİŞİKLİK BURADA: Flash yerine PRO modelini kullanıyoruz
      model: "gemini-1.5-pro",
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const prompt = `
      Sen uzman bir Gıda Mühendisisin. Bu gıda etiketini analiz et.
      1. Görseldeki metinleri (İçindekiler, Besin Değerleri) oku.
      2. Ürün adını bulamazsan tahmin et.
      3. Sağlık puanını (healthScore) verilere göre hesapla.
      4. Sadece Türkçe yanıt ver.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      },
      prompt
    ]);

    const text = result.response.text();
    return JSON.parse(text) as FoodAnalysis;

  } catch (error: any) {
    console.error("Hata Detayı:", error);
    let errorMessage = error.message || error.toString();
    
    if (errorMessage.includes("404")) errorMessage = "Model Bulunamadı (404): Lütfen 1-2 dakika daha bekleyin, sistem güncelleniyor.";
    if (errorMessage.includes("API key")) errorMessage = "API Anahtarı Hatası: Vercel ayarlarını kontrol edin.";
    
    throw new Error(`Servis Hatası: ${errorMessage}`);
  }
};
