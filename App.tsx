import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Scan, Upload, Loader2, Camera, AlertCircle, Lightbulb } from 'lucide-react';
import { analyzeFoodImage, fileToBase64 } from './services/geminiService';
import { FoodAnalysis, AppState } from './types';
import ResultCard from './components/ResultCard';

// Bekleme ekranında dönecek faydalı bilgiler
const LOADING_TIPS = [
  "Biliyor muydunuz? İçindekiler listesi her zaman 'en çok kullanılan' maddeden 'en aza' doğru sıralanır.",
  "E-kodlarının hepsi zararlı değildir. Örneğin E300 sadece C Vitaminidir (Askorbik Asit).",
  "Yetişkin bir insanın günlük tuz tüketimi 5 gramı (yaklaşık 1 çay kaşığı) geçmemelidir.",
  "NutriScan, karmaşık kimyasal isimleri sizin için tarıyor ve analiz ediyor...",
  "Paketli ürünlerdeki 'Şeker İlavesiz' ibaresi, ürünün doğal şeker içermediği anlamına gelmez.",
  "Trans yağlar, kalp sağlığı için en riskli yağ türüdür. Etiketlerde 'Hidrojenize Yağ' olarak da geçer.",
  "Görsel netliği ne kadar iyi olursa, yapay zeka o kadar hassas analiz yapar."
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Bekleme ekranındaki yazıların değişmesini sağlayan zamanlayıcı
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (appState === AppState.ANALYZING) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
      }, 2500); // Her 2.5 saniyede bir bilgi değişir
    }
    return () => clearInterval(interval);
  }, [appState]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      await processFile(file);
      event.target.value = ''; 
    }
  }, []);

  const processFile = async (file: File) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    setCurrentTipIndex(0); // Her seferinde ilk ipucuyla başla

    try {
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
      setErrorMsg(err.message || "Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } 
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setAnalysis(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8">
      
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

      <main className="w-full max-w-2xl flex-1 flex flex-col">
        
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] animate-fade-in text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Scan className="text-blue-600" size={40} />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Gıda Etiketini Tara</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Ürünün <strong>içindekiler kısmının</strong> veya <strong>besin değerleri tablosunun</strong> fotoğrafını çekin. Yapay zeka sizin için analiz etsin.
              </p>

              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <input
                  type="file"
                  accept="image/*"
                  ref={galleryInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition transform active:scale-95 flex items-center justify-center gap-3"
                >
                  <Camera size={20} />
                  Fotoğraf Çek / Tara
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

        {/* YENİLENMİŞ YÜKLENİYOR EKRANI (Bilgi Kartları) */}
        {appState === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[50vh] p-6">
            
            {/* Animasyonlu Tarayıcı Logosu */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-white p-6 rounded-full shadow-xl border-4 border-green-50">
                <Loader2 className="animate-spin text-green-600" size={48} />
              </div>
            </div>

            {/* Başlık */}
            <h2 className="text-xl font-bold text-gray-800 mb-6 animate-pulse">
              Etiket Analiz Ediliyor...
            </h2>

            {/* Bilgi Kartı */}
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden transition-all duration-500">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-blue-500"></div>
              
              <div className="flex items-start gap-4">
                <div className="bg-yellow-100 p-2 rounded-lg flex-shrink-0">
                  <Lightbulb className="text-yellow-600" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Faydalı Bilgi
                  </h3>
                  <p className="text-gray-700 font-medium leading-relaxed animate-fade-in" key={currentTipIndex}>
                    {LOADING_TIPS[currentTipIndex]}
                  </p>
                </div>
              </div>
            </div>
            
            {/* İlerleme Çubuğu */}
            <div className="mt-8 w-64 bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-green-500 h-1.5 rounded-full animate-progress"></div>
            </div>
            
          </div>
        )}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <AlertCircle className="text-red-600" size={40} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bir Hata Oluştu</h3>
            <p className="text-gray-600 mb-6">{errorMsg}</p>
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
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
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
      {/* ... (main etiketi bittikten sonra, en dıştaki div kapanmadan önce) */}
      
      <footer className="w-full py-6 text-center">
        <p className="text-sm text-gray-400">
          Geliştirici: <span className="font-semibold text-gray-600">Cafer Ahmet Koç</span>
        </p>
      </footer>

      {/* style etiketleri buranın altında kalacak */}
    </div>
  );
};

export default App;
