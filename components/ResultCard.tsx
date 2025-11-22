import React from 'react';
import { FoodAnalysis, Additive } from '../types';
import ScoreGauge from './ScoreGauge';
import { CheckCircle, AlertTriangle, XCircle, Info, Leaf, Wheat, Droplet, Share2, Sparkles } from 'lucide-react';

interface ResultCardProps {
  analysis: FoodAnalysis;
  onReset: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ analysis, onReset }) => {
  
  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'Excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'Good': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Average': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Poor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Bad': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskBadge = (risk: string) => {
     switch (risk) {
      case 'Safe': return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Güvenli</span>;
      case 'Moderate': return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Orta Risk</span>;
      case 'High': return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Yüksek Risk</span>;
      default: return null;
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `NutriScan: ${analysis.productName}`,
      text: `🍎 NutriScan Gıda Analizi\n\nÜrün: ${analysis.productName}\nSağlık Puanı: ${analysis.healthScore}/100\nSonuç: ${analysis.verdict}\n\nÖzet: ${analysis.summary}\n\nDaha sağlıklı seçimler için NutriScan AI kullanın.`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.text);
        alert("Analiz sonucu kopyalandı!");
      }
    } catch (err) {
      console.error("Paylaşım hatası:", err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in pb-24 relative">
      
      {/* Header Section */}
      <div className="bg-white p-6 border-b border-gray-100 relative">
        <button 
          onClick={handleShare}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-full transition"
          aria-label="Paylaş"
        >
          <Share2 size={20} />
        </button>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0">
             <ScoreGauge score={analysis.healthScore} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 pr-8">{analysis.productName || "Bilinmeyen Ürün"}</h2>
            <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold border ${getVerdictColor(analysis.verdict)}`}>
              {analysis.verdict === 'Excellent' ? 'Mükemmel' : 
               analysis.verdict === 'Good' ? 'İyi' : 
               analysis.verdict === 'Average' ? 'Ortalama' : 
               analysis.verdict === 'Poor' ? 'Zayıf' : 'Kötü'}
            </div>
             <div className="flex gap-3 justify-center md:justify-start mt-4 flex-wrap">
                {analysis.isVegetarian && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                    <Leaf size={12} /> Vejetaryen
                  </span>
                )}
                {analysis.isGlutenFree && (
                   <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                    <Wheat size={12} /> Glutensiz
                  </span>
                )}
                 {analysis.isPalmOilFree && (
                   <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                    <Droplet size={12} /> Palmiye Yağı Yok
                  </span>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-6 bg-blue-50 border-b border-blue-100">
        <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Info size={16} /> Analiz Özeti
        </h3>
        <p className="text-blue-800 text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Alternatives Section (Displayed only if present) */}
      {analysis.alternatives && analysis.alternatives.length > 0 && (
        <div className="p-6 bg-purple-50 border-b border-purple-100">
           <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Sparkles size={16} /> Daha Sağlıklı Alternatifler
          </h3>
          <div className="grid gap-3">
            {analysis.alternatives.map((alt, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex flex-col">
                <span className="font-bold text-purple-700">{alt.productName}</span>
                <span className="text-xs text-gray-600 mt-1">{alt.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pros & Cons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b border-gray-100">
        <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
          <h3 className="text-green-600 font-bold mb-4 flex items-center gap-2">
            <CheckCircle size={20} /> Faydaları
          </h3>
          <ul className="space-y-2">
            {analysis.pros.map((pro, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                {pro}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6">
          <h3 className="text-red-600 font-bold mb-4 flex items-center gap-2">
            <XCircle size={20} /> Zararları / Uyarılar
          </h3>
          <ul className="space-y-2">
            {analysis.cons.map((con, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Additives Section */}
      {analysis.additives.length > 0 && (
        <div className="p-6 bg-gray-50">
          <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-600" /> 
            Katkı Maddeleri & İçerik Analizi
          </h3>
          <div className="space-y-3">
            {analysis.additives.map((additive, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-800 text-sm">
                    {additive.code ? `${additive.code} - ` : ''}{additive.name}
                  </span>
                  {getRiskBadge(additive.riskLevel)}
                </div>
                <p className="text-xs text-gray-500">{additive.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="fixed bottom-4 left-0 right-0 px-4 flex justify-center z-10">
        <button
          onClick={onReset}
          className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-full shadow-lg font-medium transition transform active:scale-95 flex items-center gap-2"
        >
          Yeni Tarama Yap
        </button>
      </div>

    </div>
  );
};

export default ResultCard;