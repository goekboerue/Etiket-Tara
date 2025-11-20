import React, { useState, useRef, useCallback } from 'react';
import { Scan, Upload, Loader2, Camera, AlertCircle, QrCode } from 'lucide-react';
import { analyzeFoodImage, fileToBase64 } from './services/geminiService';
import { FoodAnalysis, AppState } from './types';
import ResultCard from './components/ResultCard';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Separate refs for Camera and Gallery inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      await processFile(file);
    }
  }, []);

  const processFile = async (file: File) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);

    try {
      // Simple validation
      if (!file.type.startsWith('image/')) {
        throw new Error('Lütfen geçerli bir resim dosyası yükleyin.');
      }

      const base64 = await fileToBase64(file);
      const result = await analyzeFoodImage(base64, file.type);
      
      setAnalysis(result);
      setAppState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setAppState(AppState.ERROR);
      
      // Sanitize error message for user display
      let message = "Analiz sırasında bir hata oluştu.";
      if (err.message) {
        if (err.message.includes("503") || err.message.includes("overloaded")) {
          message = "Sunucular şu an çok yoğun. Lütfen kısa bir süre sonra tekrar deneyin.";
        } else if (err.message.includes("API Key")) {
          message = "API Anahtarı eksik veya hatalı.";
        } else {
          // Clean up raw JSON errors if they leak through
          message = err.message.replace(/\{.*"message":\s*"(.*?)".*\}/g, '$1').substring(0, 100) + "...";
        }
      }
      setErrorMsg(message);
    } finally {
      // Reset inputs so same file can be selected again if needed
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setAnalysis(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8">
      
      {/* Header */}
      <header className="w-full max-w-2xl mb-8 flex items-center justify-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 p-2 rounded-lg shadow-lg shadow-green-500/20">
            <Scan className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Nutri<span className="text-green-600">Scan</span> AI
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl flex-1 flex flex-col">
        
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] animate-fade-in text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <QrCode className="text-blue-600" size={40} />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Etiket veya Barkod Tara</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Ürünün <strong>etiketini</strong>, <strong>barkodunu</strong> veya <strong>QR kodunu</strong> çekin. Marka görünmese bile yapay zeka içeriği analiz eder.
              </p>

              <div className="space-y-4">
                {/* Hidden Input 1: Camera (Forces camera on mobile) */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment" 
                  ref={cameraInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="camera-input"
                />

                {/* Hidden Input 2: Gallery (Standard file picker) */}
                <input
                  type="file"
                  accept="image/*"
                  // No capture attribute allows gallery selection
                  ref={galleryInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="gallery-input"
                />

                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition transform active:scale-95 flex items-center justify-center gap-3"
                >
                  <Camera size={20} />
                  Fotoğraf Çek
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400">veya</span>
                  </div>
                </div>

                <button 
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-3"
                >
                  <Upload size={20} />
                  Galeriden Yükle
                </button>
              </div>
            </div>
            
            <p className="mt-8 text-xs text-gray-400 max-w-xs mx-auto">
              *Sonuçlar bilgilendirme amaçlıdır. Tıbbi tavsiye yerine geçmez.
            </p>
          </div>
        )}

        {appState === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[50vh]">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-white p-6 rounded-full shadow-xl">
                <Loader2 className="animate-spin text-blue-600" size={48} />
              </div>
            </div>
            <h2 className="mt-8 text-xl font-semibold text-gray-800">Analiz Yapılıyor...</h2>
            <p className="mt-2 text-gray-500 text-sm">Etiket, QR kod veya ürün görseli taranıyor.</p>
            
            <div className="mt-8 w-64 bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full animate-progress"></div>
            </div>
          </div>
        )}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <AlertCircle className="text-red-600" size={40} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bir Hata Oluştu</h3>
            <p className="text-gray-600 mb-6 max-w-xs mx-auto">{errorMsg}</p>
            <button
              onClick={resetApp}
              className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {appState === AppState.RESULT && analysis && (
          <ResultCard analysis={analysis} onReset={resetApp} />
        )}

      </main>
      
      {/* Simple footer styles injection for custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 90%; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default App;