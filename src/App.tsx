import React, { useState, useCallback, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import WorldMap from './components/WorldMap';
import BarChart from './components/BarChart';
import PieChart from './components/PieChart';
import DataTable from './components/DataTable';
import SectorWeights from './components/SectorWeights';
import { processExcelData } from './utils/dataProcessing';
import { defaultSectorWeights } from './utils/constants';
import type { CountryData, SectorWeights as SectorWeightsType } from './types';

function App() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [data, setData] = useState<CountryData[]>([]);
  const [sectorWeights, setSectorWeights] = useState<SectorWeightsType>(defaultSectorWeights);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
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
            Country: countryCell.v
          };

          // Get values for each sector
          headers.forEach((header, index) => {
            const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: index + 1 })];
            row[header] = cell ? Number(cell.v) : 0;
          });

          jsonData.push(row);
        }

        setRawData(jsonData);
        const processedData = processExcelData(jsonData, sectorWeights);
        
        if (processedData.length === 0) {
          setError('Failed to process data. Please check the file format and try again.');
          return;
        }

        setData(processedData);
        setError(null);
      } catch (err) {
        console.error('File processing error:', err);
        setError('Error reading file. Please ensure it is a valid Excel file with the correct format.');
      }
    };

    reader.onerror = () => {
      setError('Error reading file. Please try again.');
    };

    reader.readAsBinaryString(file);
  }, [sectorWeights]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    }
  });

  useEffect(() => {
    if (rawData.length > 0) {
      const processedData = processExcelData(rawData, sectorWeights);
      setData(processedData);
    }
  }, [sectorWeights, rawData]);

  const handleSectorWeightChange = (sector: string, value: number) => {
    setSectorWeights(prev => ({
      ...prev,
      [sector]: value
    }));
  };

  const handleSectorSelect = (sector: string | null) => {
    setSelectedSector(sector);
  };

  const handleCountrySelect = (country: string | null) => {
    setSelectedCountry(country);
  };

  const handleReset = () => {
    setSelectedSector(null);
    setSelectedCountry(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <img 
              src="/image.png" 
              alt="Belfer Center Logo" 
              className="h-16"
            />
            {data.length > 0 && (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 transition-colors"
              >
                Reset Selection
              </button>
            )}
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Critical and Emerging Technologies Index 2025
            </h1>
            <h2 className="text-2xl mb-2">
              Defense, Emerging Technologies, and Strategy Project
            </h2>
            <h3 className="text-xl">
              Belfer Center for Science and International Affairs
            </h3>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div 
            {...getRootProps()} 
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600">
              {isDragActive ? 
                "Drop the Excel file here..." : 
                "Drag and drop the Belfer_DETS_Index_dashboard_test.xlsx file here, or click to select it"
              }
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Only .xlsx or .xls files are accepted
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Left Panel - Sector Weights */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h2 className="text-xl font-semibold mb-4">Sector Weights</h2>
                <SectorWeights 
                  weights={sectorWeights} 
                  onChange={handleSectorWeightChange} 
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow space-y-6">
              {/* World Map */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Global View</h2>
                <WorldMap 
                  data={data} 
                  selectedSector={selectedSector}
                  selectedCountry={selectedCountry}
                  onCountrySelect={handleCountrySelect}
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-5 gap-6">
                {/* Bar Chart (3 columns) */}
                <div className="col-span-3 bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">Country Rankings</h2>
                  <BarChart 
                    data={data} 
                    selectedSector={selectedSector}
                    selectedCountry={selectedCountry}
                    onCountrySelect={handleCountrySelect}
                  />
                </div>

                {/* Pie Chart (2 columns) */}
                <div className="col-span-2 bg-white rounded-lg shadow-sm p-6 overflow-hidden">
                  <h2 className="text-xl font-semibold mb-4">Sector Distribution</h2>
                  <div className="relative" style={{ height: "400px" }}>
                    <PieChart 
                      data={selectedCountry ? data.filter(d => d.country === selectedCountry) : data}
                      selectedSector={selectedSector}
                      onSectorSelect={handleSectorSelect}
                    />
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Data Table</h2>
                <DataTable 
                  data={data} 
                  selectedSector={selectedSector}
                  selectedCountry={selectedCountry}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;