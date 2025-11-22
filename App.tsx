import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Scan, Upload, Loader2, Camera, AlertCircle, QrCode, History as HistoryIcon, Home } from 'lucide-react';
import { analyzeFoodImage, fileToBase64 } from './services/geminiService';
import { FoodAnalysis, AppState } from './types';
import ResultCard from './components/ResultCard';
import HistoryView from './components/HistoryView';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  
  // History State
  const [history, setHistory] = useState<FoodAnalysis[]>(() => {
    try {
      const saved = localStorage.getItem('nutriscan_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('nutriscan_history', JSON.stringify(history));
  }, [history]);

  // Separate refs for Camera and Gallery inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      await processFile(file);
    }
  }, [history]); // Add history dependency as we might update it

  const processFile = async (file: File) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    setShowHistory(false);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Lütfen geçerli bir resim dosyası yükleyin.');
      }

      const base64 = await fileToBase64(file);
      const result = await analyzeFoodImage(base64, file.type);
      
      // Add ID and Timestamp
      const resultWithMeta: FoodAnalysis = {
        ...result,
        id: Date.now().toString(),
        timestamp: Date.now()
      };

      // Update History (add to top)
      setHistory(prev => [resultWithMeta, ...prev]);
      
      setAnalysis(resultWithMeta);
      setAppState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setAppState(AppState.ERROR);
      
      let message = "Analiz sırasında bir hata oluştu.";
      if (err.message) {
        if (err.message.includes("503") || err.message.includes("overloaded")) {
          message = "Sunucular şu an çok yoğun. Lütfen kısa bir süre sonra tekrar deneyin.";
        } else if (err.message.includes("API Key")) {
          message = "API Anahtarı eksik veya hatalı.";
        } else {
          message = err.message.replace(/\{.*"message":\s*"(.*?)".*\}/g, '$1').substring(0, 100) + "...";
        }
      }
      setErrorMsg(message);
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setAnalysis(null);
    setErrorMsg(null);
    setShowHistory(false);
  };

  const toggleHistory = () => {
    if (showHistory) {
      // Go back home
      resetApp();
    } else {
      // Show history
      setShowHistory(true);
      setAppState(AppState.IDLE); // Ensure not in analyzing state
    }
  };

  const selectFromHistory = (item: FoodAnalysis) => {
    setAnalysis(item);
    setAppState(AppState.RESULT);
    setShowHistory(false);
  };

  const clearHistory = () => {
    if (window.confirm("Tüm analiz geçmişini silmek istediğinize emin misiniz?")) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8">
      
      {/* Header */}
      <header className="w-full max-w-2xl mb-8 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
          onClick={resetApp}
        >
          <div className="bg-green-500 p-2 rounded-lg shadow-lg shadow-green-500/20">
            <Scan className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Nutri<span className="text-green-600">Scan</span> AI
          </h1>
        </div>

        {/* History Toggle Button */}
        <button 
          onClick={toggleHistory}
          className={`p-3 rounded-full transition shadow-sm border ${
            showHistory 
              ? "bg-blue-100 text-blue-600 border-blue-200" 
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
          aria-label={showHistory ? "Ana Sayfa" : "Geçmiş"}
        >
          {showHistory ? <Home size={20} /> : <HistoryIcon size={20} />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl flex-1 flex flex-col">
        
        {showHistory ? (
          <HistoryView 
            history={history} 
            onSelect={selectFromHistory} 
            onClear={clearHistory}
          />
        ) : (
          <>
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
                    {/* Hidden Inputs */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment" 
                      ref={cameraInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      id="camera-input"
                    />
                    <input
                      type="file"
                      accept="image/*"
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
          </>
        )}

      </main>

      {!showHistory && appState === AppState.IDLE && (
        <footer className="w-full py-6 text-center mt-auto">
          <p className="text-gray-400 text-sm flex items-center justify-center gap-1">
            Geliştirici: <span className="font-handwriting text-xl text-gray-600">Cafer Ahmet Koç</span>
          </p>
        </footer>
      )}
      
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