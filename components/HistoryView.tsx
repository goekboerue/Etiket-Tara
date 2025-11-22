import React from 'react';
import { FoodAnalysis } from '../types';
import { Calendar, ChevronRight, Trash2 } from 'lucide-react';

interface HistoryViewProps {
  history: FoodAnalysis[];
  onSelect: (analysis: FoodAnalysis) => void;
  onClear: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelect, onClear }) => {
  
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <div className="bg-gray-100 p-6 rounded-full mb-4">
          <Calendar className="text-gray-400" size={40} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Henüz bir geçmiş yok</h3>
        <p className="text-gray-500 mt-2">Yaptığınız analizler burada listelenecektir.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-xl font-bold text-gray-800">Analiz Geçmişi</h2>
        <button 
          onClick={onClear}
          className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 px-3 py-1 rounded-full hover:bg-red-50 transition"
        >
          <Trash2 size={14} /> Temizle
        </button>
      </div>

      <div className="space-y-4">
        {history.map((item, index) => (
          <div 
            key={item.id || index}
            onClick={() => onSelect(item)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex items-center gap-4 active:scale-[0.99]"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 font-bold text-sm">
              <span className={getScoreColor(item.healthScore)}>{item.healthScore}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{item.productName}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <Calendar size={12} />
                <span>{formatDate(item.timestamp)}</span>
              </div>
            </div>

            <ChevronRight className="text-gray-300" size={20} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryView;