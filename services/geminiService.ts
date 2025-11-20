import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { FoodAnalysis } from "../types";

// RESİM SIKIŞTIRMA FONKSİYONU
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
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
          reject(new Error("Canvas oluşturulamadı (Tarayıcı hatası)."));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = () => reject(new Error("Resim dosyası bozuk veya okunamıyor."));
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeFoodImage = async (base64Image: string, mimeType: string): Promise<FoodAnalysis> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("API Anahtarı Bulunamadı! Lütfen Vercel ayarlarında 'VITE_GEMINI_API_KEY' adında bir değişken olduğundan emin olun.");
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
      model: "gemini-1.5-flash",
      // Güvenlik ayarlarını en aza indiriyoruz ki gıda resimlerini engellemesin
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
    console.error("Gerçek Hata Detayı:", error);
    
    // Hatanın içindeki asıl mesajı yakalayıp kullanıcıya gösterelim
    let errorMessage = error.message || error.toString();
    
    if (errorMessage.includes("400")) errorMessage = "İstek Hatası (400): API Anahtarı geçersiz veya görsel formatı bozuk.";
    if (errorMessage.includes("403")) errorMessage = "Erişim Reddedildi (403): API Anahtarınızın yetkisi yok veya Vercel'de yanlış girilmiş.";
    if (errorMessage.includes("429")) errorMessage = "Kota Aşıldı (429): Çok fazla istek gönderdiniz, biraz bekleyin.";
    if (errorMessage.includes("Vercel")) errorMessage = "API Anahtarı eksik. Vercel ayarlarını kontrol edin.";
    
    throw new Error(`Servis Hatası: ${errorMessage}`);
  }
};
