import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import Select from 'react-select';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { CountryData, InteractiveProps } from '../types';
import { calculateColorIntensity } from '../utils/dataProcessing';

interface Props extends Partial<InteractiveProps> {
  data: CountryData[];
  selectedSector: string | null;
}

interface CountryOption {
  value: string;
  label: string;
}

const WorldMap: React.FC<Props> = ({ 
  data, 
  selectedSector, 
  selectedCountry,
  onCountrySelect 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>();
  const geoPathRef = useRef<d3.GeoPath>();
  const featuresRef = useRef<any[]>([]);

  const countryOptions = useMemo(() => {
    return data
      .map(country => ({
        value: country.country,
        label: country.country
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const selectedOption = useMemo(() => {
    return selectedCountry ? {
      value: selectedCountry,
      label: selectedCountry
    } : null;
  }, [selectedCountry]);

  const handleZoom = (action: 'in' | 'out' | 'reset') => {
    if (!svgRef.current || !zoomRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;

    if (action === 'reset') {
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    } else {
      const scale = action === 'in' ? 1.5 : 0.667;
      const currentTransform = d3.zoomTransform(svg.node()!);
      
      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          currentTransform.scale(scale)
        );
    }
  };

  const zoomToCountry = (countryName: string | null) => {
    if (!svgRef.current || !zoomRef.current || !geoPathRef.current || !countryName) return;

    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;
    const path = geoPathRef.current;
    const width = svgRef.current.clientWidth;
    const height = 400;

    // Find the selected country's feature
    const feature = featuresRef.current.find(f => f.properties.name === countryName);
    
    if (feature) {
      // Get the bounds of the country
      const bounds = path.bounds(feature);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;
      
      // Calculate the scale and translate parameters
      const scale = Math.min(8, 0.9 / Math.max(dx / width, dy / height));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];
      
      // Apply the transformation
      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity
            .translate(translate[0], translate[1])
            .scale(scale)
        );
    } else {
      // If country not found, reset the view
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    }
  };

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const width = svgRef.current.clientWidth;
    const height = 400;
    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Create projection
    const projection = d3.geoMercator()
      .scale((width - 3) / (2 * Math.PI))
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);
    geoPathRef.current = path;

    // Create main group for map content
    const g = svg.append("g");

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style("position", "fixed")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("padding", "8px 12px")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("font-size", "14px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    // Load world map data
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(response => response.json())
      .then(worldData => {
        const countries = feature(worldData, worldData.objects.countries);
        featuresRef.current = countries.features;

        // Calculate max score for color scaling
        const maxScore = d3.max(data, d => 
          selectedSector ? d.sectorScores[selectedSector] : d.totalScore
        ) || 0;

        // Create a map of country names to their data for faster lookup
        const countryDataMap = new Map(data.map(d => [d.country, d]));

        // Draw map
        g.selectAll('path')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('d', path as any)
          .attr('fill', (d: any) => {
            const countryData = countryDataMap.get(d.properties.name);
            if (!countryData) return '#e2e8f0';
            const score = selectedSector ? 
              countryData.sectorScores[selectedSector] : 
              countryData.totalScore;
            return calculateColorIntensity(score, maxScore);
          })
          .attr('stroke', '#cbd5e0')
          .attr('stroke-width', (d: any) => {
            const isSelected = selectedCountry === d.properties.name;
            return isSelected ? 2 : 0.5;
          })
          .style('opacity', (d: any) => {
            if (!selectedCountry) return 1;
            return selectedCountry === d.properties.name ? 1 : 0.5;
          })
          .style('cursor', 'pointer')
          .on('click', (event, d: any) => {
            if (onCountrySelect) {
              const newCountry = selectedCountry === d.properties.name ? null : d.properties.name;
              onCountrySelect(newCountry);
              zoomToCountry(newCountry);
            }
          })
          .on('mouseover', (event, d: any) => {
            const countryData = countryDataMap.get(d.properties.name);
            if (countryData) {
              tooltip
                .style("visibility", "visible")
                .html(`
                  <div class="font-semibold">${countryData.country}</div>
                  <div>Total Score: ${countryData.totalScore.toFixed(3)}</div>
                  ${selectedSector ? 
                    `<div>${selectedSector}: ${countryData.sectorScores[selectedSector].toFixed(3)}</div>` :
                    Object.entries(countryData.sectorScores)
                      .map(([sector, score]) => 
                        `<div>${sector}: ${score.toFixed(3)}</div>`
                      ).join('')
                  }
                `);

              d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr('stroke-width', '2')
                .attr('stroke', '#4A5568');
            }
          })
          .on('mousemove', (event) => {
            const [mouseX, mouseY] = d3.pointer(event, document.body);
            const tooltipNode = tooltip.node() as HTMLDivElement;
            const tooltipWidth = tooltipNode.offsetWidth;
            const tooltipHeight = tooltipNode.offsetHeight;
            
            let left = mouseX + 16;
            let top = mouseY - tooltipHeight / 2;
            
            if (left + tooltipWidth > window.innerWidth) {
              left = mouseX - tooltipWidth - 16;
            }
            
            if (top < 0) {
              top = 0;
            } else if (top + tooltipHeight > window.innerHeight) {
              top = window.innerHeight - tooltipHeight;
            }
            
            tooltip
              .style("left", `${left}px`)
              .style("top", `${top}px`);
          })
          .on('mouseout', (event) => {
            tooltip.style("visibility", "hidden");
            
            d3.select(event.currentTarget)
              .transition()
              .duration(200)
              .attr('stroke-width', d => {
                const isSelected = selectedCountry === (d as any).properties.name;
                return isSelected ? 2 : 0.5;
              })
              .attr('stroke', '#cbd5e0');
          });

        // Add zoom behavior
        const zoom = d3.zoom()
          .scaleExtent([1, 8])
          .on('zoom', (event) => {
            g.attr('transform', event.transform);
          });

        zoomRef.current = zoom;
        svg.call(zoom as any);

        // Initial zoom to selected country if any
        if (selectedCountry) {
          zoomToCountry(selectedCountry);
        }
      });
  }, [data, selectedSector, selectedCountry, onCountrySelect]);

  // Handle country selection from dropdown
  const handleCountrySelect = (option: CountryOption | null) => {
    const countryName = option?.value || null;
    onCountrySelect?.(countryName);
    zoomToCountry(countryName);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select<CountryOption>
          className="w-64"
          value={selectedOption}
          onChange={handleCountrySelect}
          options={countryOptions}
          isClearable
          placeholder="Search for a country..."
          classNames={{
            control: (state) => 
              `!bg-white !border-gray-300 !shadow-sm hover:!border-gray-400 ${
                state.isFocused ? '!border-blue-500 !ring-1 !ring-blue-500' : ''
              }`,
            option: (state) =>
              `!py-2 !px-3 ${
                state.isSelected
                  ? '!bg-blue-500 !text-white'
                  : state.isFocused
                  ? '!bg-blue-50 !text-gray-900'
                  : '!text-gray-700'
              }`,
          }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom('in')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handleZoom('reset')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          width="100%"
          height="400"
          className="bg-gray-50"
          style={{ overflow: "hidden" }}
        />
        <div ref={tooltipRef} />
      </div>
    </div>
  );
};

export default WorldMap;