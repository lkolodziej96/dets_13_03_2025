import type { CountryData, SectorWeights } from '../types';
import { validateAndProcessData, standardizeCountryNames } from './dataValidation';

export function processExcelData(rawData: any[], weights: SectorWeights): CountryData[] {
  try {
    // First validate and process the raw data
    const { data: validatedData, validation } = validateAndProcessData(rawData);

    if (!validation.isValid) {
      if (validation.errors.length > 0) {
        console.log('Data validation failed:', validation.errors);
      }
      if (validation.warnings.length > 0) {
        console.log('Validation warnings:', validation.warnings);
      }
      return [];
    }

    // Standardize country names
    const standardizedData = standardizeCountryNames(validatedData);

    // Apply weights and calculate scores
    return standardizedData.map((country) => {
      const sectorScores = {
        ai: parseFloat(country.ai) * weights.ai,
        quantum: parseFloat(country.quantum) * weights.quantum,
        semiconductors: parseFloat(country.semiconductors) * weights.semiconductors,
        biotech: parseFloat(country.biotech) * weights.biotech,
        space: parseFloat(country.space) * weights.space,
        fintech: parseFloat(country.fintech) * weights.fintech,
      };

      const totalScore = Object.values(sectorScores).reduce((sum, score) => sum + score, 0);

      return {
        ...country,
        totalScore,
        sectorScores,
      };
    });
  } catch (error) {
    console.log('Error processing data:', error);
    return [];
  }
}

export function calculateColorIntensity(value: number, max: number): string {
  const intensity = Math.max(0, Math.min(0.9, value / max));
  return `rgba(34, 197, 94, ${intensity})`;
}
