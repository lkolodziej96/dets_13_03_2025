export interface CountryData {
  country: string;
  ai: number;
  quantum: number;
  semiconductors: number;
  biotech: number;
  space: number;
  fintech: number;
  totalScore: number;
  sectorScores: {
    [key: string]: number;
  };
}

export interface SectorWeights {
  ai: number;
  quantum: number;
  semiconductors: number;
  biotech: number;
  space: number;
  fintech: number;
}

export interface InteractiveProps {
  selectedCountry: string | null;
  onCountrySelect: (country: string | null) => void;
}
