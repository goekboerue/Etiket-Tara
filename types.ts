export interface Additive {
  code: string;
  name: string;
  riskLevel: 'Safe' | 'Moderate' | 'High';
  description: string;
}

export interface NutritionFact {
  name: string;
  amount: string;
  status: 'Good' | 'Bad' | 'Neutral';
}

export interface FoodAnalysis {
  productName: string;
  healthScore: number; // 0 to 100
  verdict: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Bad';
  summary: string;
  pros: string[];
  cons: string[];
  additives: Additive[];
  highlights: string[];
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isPalmOilFree: boolean;
}

export enum AppState {
  IDLE,
  ANALYZING,
  RESULT,
  ERROR
}