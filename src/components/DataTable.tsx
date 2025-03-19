import React from 'react';
import type { CountryData } from '../types';
import { sectorNames } from '../utils/constants';
import { calculateColorIntensity } from '../utils/dataProcessing';

interface Props {
  data: CountryData[];
  selectedSector: string | null;
  selectedCountry: string | null;
}

const DataTable: React.FC<Props> = ({ data, selectedSector, selectedCountry }) => {
  const [sortField, setSortField] = React.useState<string>('totalScore');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  const sortedData = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const aValue = sortField === 'totalScore' ? a.totalScore : a.sectorScores[sortField];
      const bValue = sortField === 'totalScore' ? b.totalScore : b.sectorScores[sortField];
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
    return sorted;
  }, [data, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const maxScores = React.useMemo(() => {
    const scores = {
      totalScore: Math.max(...data.map((d) => d.totalScore)),
      ...Object.keys(data[0].sectorScores).reduce(
        (acc, sector) => ({
          ...acc,
          [sector]: Math.max(...data.map((d) => d.sectorScores[sector])),
        }),
        {},
      ),
    };
    return scores;
  }, [data]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('country')}
            >
              Country
            </th>
            {Object.keys(data[0].sectorScores).map((sector) => (
              <th
                key={sector}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                  selectedSector && selectedSector !== sector ? 'opacity-50' : ''
                }`}
                onClick={() => handleSort(sector)}
              >
                {sectorNames[sector]}
              </th>
            ))}
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('totalScore')}
            >
              Total Score
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((country) => (
            <tr
              key={country.country}
              className={`hover:bg-gray-50 ${
                selectedCountry === country.country ? 'bg-blue-50' : ''
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {country.country}
              </td>
              {Object.entries(country.sectorScores).map(([sector, score]) => (
                <td
                  key={sector}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${
                    selectedSector && selectedSector !== sector ? 'opacity-50' : ''
                  }`}
                  style={{
                    backgroundColor: calculateColorIntensity(score, maxScores[sector]),
                  }}
                >
                  {score.toFixed(3)}
                </td>
              ))}
              <td
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                style={{
                  backgroundColor: calculateColorIntensity(
                    country.totalScore,
                    maxScores.totalScore,
                  ),
                }}
              >
                {country.totalScore.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
