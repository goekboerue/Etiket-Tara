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

export interface AlternativeProduct {
  productName: string;
  reason: string;
}

export interface FoodAnalysis {
  id?: string; // Unique ID for history
  timestamp?: number; // Date of scan
  productName: string;
  healthScore: number; // 0 to 100
  verdict: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Bad';
  summary: string;
  pros: string[];
  cons: string[];
  additives: Additive[];
  alternatives?: AlternativeProduct[]; // Suggested healthier swaps
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