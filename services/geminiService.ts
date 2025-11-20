import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { FoodAnalysis } from "../types";

// Dosyayı Base64 formatına çeviren yardımcı fonksiyon
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
  // 1. API Anahtarını alıyoruz
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key eksik! Lütfen Vercel ayarlarında VITE_GEMINI_API_KEY tanımlayın.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // 2. Cevap formatını (Şema) tanımlıyoruz
  const schema = {
    description: "Gıda analiz sonucu",
    type: SchemaType.OBJECT,
    properties: {
      productName: { 
        type: SchemaType.STRING, 
        description: "Ürünün adı. Eğer marka görünmüyorsa, ürünün ne olduğunu yaz (Örn: 'Kakaolu Bisküvi', 'Meyve Suyu')." 
      },
      healthScore: { 
        type: SchemaType.NUMBER, 
        description: "0 ile 100 arası sağlık puanı. İçeriklere göre hesapla." 
      },
      verdict: { 
        type: SchemaType.STRING, 
        enum: ["Excellent", "Good", "Average", "Poor", "Bad"],
        description: "Genel sağlık kararı."
      },
      summary: { 
        type: SchemaType.STRING, 
        description: "Analiz özeti (Türkçe). Ürünün ne olduğunu değil, içeriğin sağlıklı olup olmadığını anlat." 
      },
      pros: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Olumlu yönler (Türkçe). Örn: 'Şeker ilavesiz', 'Yüksek protein'."
      },
      cons: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Olumsuz yönler (Türkçe). Örn: 'Yüksek doymuş yağ', 'E102 içerir'."
      },
      additives: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            code: { type: SchemaType.STRING, description: "E-kodu (varsa)" },
            name: { type: SchemaType.STRING, description: "Maddenin adı" },
            riskLevel: { type: SchemaType.STRING, enum: ["Safe", "Moderate", "High"] },
            description: { type: SchemaType.STRING, description: "Neden riskli veya güvenli olduğu (Türkçe)" }
          },
          required: ["code", "name", "riskLevel", "description"]
        },
        description: "Tespit edilen katkı maddeleri."
      },
      highlights: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Öne çıkanlar (Türkçe)."
      },
      isVegetarian: { type: SchemaType.BOOLEAN },
      isGlutenFree: { type: SchemaType.BOOLEAN },
      isPalmOilFree: { type: SchemaType.BOOLEAN },
    },
    required: ["productName", "healthScore", "verdict", "summary", "pros", "cons", "additives", "highlights", "isVegetarian", "isGlutenFree", "isPalmOilFree"]
  };

  try {
    // 3. Modeli seçiyoruz
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    // 4. Yapay Zekaya Gönderilen KOMUT (PROMPT) - BURASI GÜNCELLENDİ
    const prompt = `
      Sen uzman bir Gıda Mühendisisin. Görevin bu görseldeki gıda etiketini analiz etmek.
      
      ÖNEMLİ KURALLAR:
      1. Markayı tanımasan bile, sadece **görseldeki metinleri (İçindekiler, Besin Değerleri Tablosu)** okuyarak analiz yap.
      2. Eğer ürünün adı görünmüyorsa, ne olduğunu tahmin et (Örn: "Bilinmeyen Kraker", "Domates Salçası") ve 'productName' alanına yaz.
      3. İçindekiler listesindeki E-kodlarını (Örn: E330, E621) veya kimyasal isimleri (Monosodyum Glutamat, Glikoz Şurubu) tespit et.
      4. "healthScore" puanını markaya göre değil, okuduğun şeker, yağ, tuz ve katkı maddesi oranlarına göre VERİLERLE hesapla.
      5. Çıktıyı sadece Türkçe olarak ver.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      },
      prompt
    ]);

    const text = result.response.text();
    return JSON.parse(text) as FoodAnalysis;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Etiket okunamadı veya bağlantı hatası oluştu. Lütfen fotoğrafın net olduğundan emin olun.");
  }
};
