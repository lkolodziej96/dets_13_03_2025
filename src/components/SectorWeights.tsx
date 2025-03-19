import React, { useMemo } from 'react';
import type { SectorWeights as SectorWeightsType } from '../types';
import { sectorNames } from '../utils/constants';

interface Props {
  weights: SectorWeightsType;
  onChange: (sector: string, value: number) => void;
}

const SectorWeights: React.FC<Props> = ({ weights, onChange }) => {
  const totalWeight = useMemo(() => {
    return Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  }, [weights]);

  const totalPercentage = Math.round(totalWeight * 100);

  const getTotalStatusInfo = () => {
    if (totalPercentage === 100) {
      return {
        message: 'Perfect allocation: 100%',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    } else if (totalPercentage < 100) {
      const remaining = 100 - totalPercentage;
      return {
        message: `${remaining}% left to allocate`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
      };
    } else {
      const excess = totalPercentage - 100;
      return {
        message: `You are ${excess}% over the limit`,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    }
  };

  const statusInfo = getTotalStatusInfo();

  return (
    <div className="space-y-4">
      <div className={`p-3 rounded-md ${statusInfo.bgColor} border ${statusInfo.borderColor} mb-4`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Current total:</span>
          <span className={`text-sm font-semibold ${statusInfo.color}`}>{totalPercentage}%</span>
        </div>
        <div className={`text-xs mt-1 ${statusInfo.color}`}>{statusInfo.message}</div>
        <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
          <div
            className={`h-2 rounded-full ${
              totalPercentage === 100
                ? 'bg-green-500'
                : totalPercentage < 100
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {Object.entries(weights).map(([sector, weight]) => (
        <div key={sector} className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">{sectorNames[sector]}</label>
            <span className="text-sm text-gray-500">{Math.round(weight * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={weight * 100}
            onChange={(e) => {
              const value = Number(e.target.value) / 100;
              onChange(sector, value);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      ))}
    </div>
  );
};

export default SectorWeights;
