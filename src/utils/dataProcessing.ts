import * as XLSX from 'xlsx';

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

export function parseXlsxData(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Get the range of the worksheet
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Extract headers (sectors) from the first row
  const headers: string[] = [];
  for (let C = range.s.c + 1; C <= range.e.c; C++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
    headers.push(cell?.v || '');
  }

  // Process each row into an object
  const jsonData = [];
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    const countryCell = worksheet[XLSX.utils.encode_cell({ r: R, c: range.s.c })];
    if (!countryCell) continue;

    const row: any = {
      Country: countryCell.v,
    };

    // Get values for each sector
    headers.forEach((header, index) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: index + 1 })];
      row[header] = cell ? Number(cell.v) : 0;
    });

    jsonData.push(row);
  }

  return jsonData;
}
