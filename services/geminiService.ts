import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { FoodAnalysis } from "../types";

// RESİM SIKIŞTIRMA VE DÖNÜŞTÜRME FONKSİYONU (HIZ OPTİMİZASYONU)
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Hedef boyut: En uzun kenar 1024px (Hem hızlı yüklenir hem de yazılar okunabilir kalır)
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
          reject(new Error("Resim işlenirken hata oluştu."));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Resmi JPEG formatına çevir ve %70 kaliteye düşür (Gözle görülmez ama dosya boyutu çok küçülür)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        // "data:image/jpeg;base64," başlığını atıp sadece veriyi döndür
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (err) => reject(new Error("Resim yüklenemedi."));
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeFoodImage = async (base64Image: string, mimeType: string): Promise<FoodAnalysis> => {
  // API Anahtarını al (Vite standardına uygun)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key eksik! Lütfen Vercel ayarlarında VITE_GEMINI_API_KEY tanımlayın.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

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
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const prompt = `
      Sen uzman bir Gıda Mühendisisin. Görevin bu görseldeki gıda etiketini analiz etmek.
      
      ÖNEMLİ KURALLAR:
      1. Markayı tanımasan bile, sadece **görseldeki metinleri (İçindekiler, Besin Değerleri Tablosu)** okuyarak analiz yap.
      2. Eğer ürünün adı görünmüyorsa, ne olduğunu tahmin et (Örn: "Bilinmeyen Kraker", "Domates Salçası") ve 'productName' alanına yaz.
      3. İçindekiler listesindeki E-kodlarını (Örn: E330, E621) veya kimyasal isimleri (Monosodyum Glutamat, Glikoz Şurubu) tespit et.
      4. "healthScore" puanını markaya göre değil, okuduğun şeker, yağ, tuz ve katkı maddesi oranlarına göre VERİLERLE hesapla.
      5. Çıktıyı sadece Türkçe olarak ver.
    `;

    // Not: Sıkıştırılmış resim her zaman jpeg formatındadır
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

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Analiz sırasında bir hata oluştu. İnternet bağlantınızı kontrol edin.");
  }
};
