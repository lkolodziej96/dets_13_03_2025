import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { CountryData } from '../types';
import { sectorColors, sectorNames } from '../utils/constants';

interface Props {
  data: CountryData[];
  selectedSector: string | null;
  selectedCountry: string | null;
  onCountrySelect: (country: string | null) => void;
}

const BarChart: React.FC<Props> = ({ data, selectedSector, selectedCountry, onCountrySelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length || !containerRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 400;
    const margin = { top: 40, right: 100, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Sort data by total score
    const sortedData = [...data].sort((a, b) => b.totalScore - a.totalScore);

    // Get all sectors
    const sectors = Object.keys(sortedData[0].sectorScores);

    // Prepare data for stacking
    const stackData = d3
      .stack<CountryData>()
      .keys(sectors)
      .value((d, key) => d.sectorScores[key])(sortedData);

    const svg = d3.select(svgRef.current);

    // Only clear if no previous elements exist
    if (svg.select('g').empty()) {
      svg.selectAll('*').remove();
      svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    }

    const g = svg.select('g');

    // Create scales
    const x = d3
      .scaleBand()
      .domain(sortedData.map((d) => d.country))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(stackData[stackData.length - 1], (d) => d[1]) || 0])
      .range([innerHeight, 0]);

    // Update axes with transitions
    const xAxis = g.select('.x-axis');
    if (xAxis.empty()) {
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-family', "'Inter', 'Helvetica', 'Arial', sans-serif")
        .style('font-size', '11px')
        .style('font-weight', '500');
    } else {
      xAxis
        .transition()
        .duration(750)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-family', "'Inter', 'Helvetica', 'Arial', sans-serif")
        .style('font-size', '11px')
        .style('font-weight', '500');
    }

    const yAxis = g.select('.y-axis');
    if (yAxis.empty()) {
      g.append('g')
        .attr('class', 'y-axis')
        .call(
          d3
            .axisLeft(y)
            .ticks(8)
            .tickFormat((d) => d.toString()),
        )
        .selectAll('text')
        .style('font-family', "'Inter', 'Helvetica', 'Arial', sans-serif")
        .style('font-size', '11px')
        .style('font-weight', '500');
    } else {
      yAxis
        .transition()
        .duration(750)
        .call(
          d3
            .axisLeft(y)
            .ticks(8)
            .tickFormat((d) => d.toString()),
        )
        .selectAll('text')
        .style('font-family', "'Inter', 'Helvetica', 'Arial', sans-serif")
        .style('font-size', '11px')
        .style('font-weight', '500');
    }

    // Style the axis lines and ticks
    svg.selectAll('.domain, .tick line').style('stroke', '#cbd5e0').style('stroke-width', '1px');

    // Create tooltip
    const tooltip = d3
      .select(tooltipRef.current)
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'white')
      .style('padding', '12px')
      .style('border', '1px solid #ddd')
      .style('border-radius', '6px')
      .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)')
      .style('pointer-events', 'none')
      .style('font-family', "'Inter', 'Helvetica', 'Arial', sans-serif")
      .style('font-size', '14px')
      .style('z-index', '1000')
      .style('min-width', '220px');

    // Update stacked bars with transitions
    const layers = g.selectAll('g.layer').data(stackData);

    // Remove old layers
    layers.exit().remove();

    // Add new layers
    const layersEnter = layers.enter().append('g').attr('class', 'layer');

    // Merge existing and new layers
    const layersMerge = layers.merge(layersEnter).style('fill', (d, i) => sectorColors[sectors[i]]);

    // Update rectangles with transitions
    const rects = layersMerge.selectAll('rect').data((d) => d);

    // Remove old rectangles
    rects.exit().remove();

    // Add new rectangles
    const rectsEnter = rects
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.data.country) || 0)
      .attr('y', innerHeight)
      .attr('height', 0)
      .attr('width', x.bandwidth());

    // Merge and transition all rectangles
    rects
      .merge(rectsEnter)
      .transition()
      .duration(750)
      .ease(d3.easeQuadOut)
      .attr('x', (d) => x(d.data.country) || 0)
      .attr('y', (d) => y(d[1]))
      .attr('height', (d) => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .style('opacity', (d, i, nodes) => {
        const currentSector = sectors[d3.select(nodes[i].parentNode).datum().index];
        if (selectedCountry && d.data.country !== selectedCountry) return 0.3;
        if (selectedSector && currentSector !== selectedSector) return 0.3;
        return 1;
      });

    // Add interactivity
    layersMerge
      .selectAll('rect')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        onCountrySelect(d.data.country === selectedCountry ? null : d.data.country);
      })
      .on('mouseover', (event, d) => {
        const hoveredSector = sectors[d3.select(event.currentTarget.parentNode).datum().index];

        // Generate HTML for all sectors with the hovered one highlighted
        const sectorsHtml = Object.entries(d.data.sectorScores)
          .map(([sector, score]) => {
            const isHovered = sector === hoveredSector;

            return `
              <div style="
                display: flex; 
                align-items: center; 
                margin-bottom: 6px;
                padding: 4px;
                background-color: ${isHovered ? '#f7fafc' : 'transparent'};
                border-radius: 4px;
                ${isHovered ? 'font-weight: 600;' : ''}
              ">
                <div style="
                  width: 12px; 
                  height: 12px; 
                  background-color: ${sectorColors[sector]}; 
                  margin-right: 8px; 
                  border-radius: 2px;
                "></div>
                <div style="flex-grow: 1; color: ${isHovered ? '#2D3748' : '#4A5568'};">
                  ${sectorNames[sector]}
                </div>
                <div style="color: ${isHovered ? '#2D3748' : '#718096'};">
                  ${score.toFixed(3)}
                </div>
              </div>
            `;
          })
          .join('');

        tooltip.style('visibility', 'visible').html(`
            <div style="font-weight: 700; margin-bottom: 8px; color: #1A202C; font-size: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
              ${d.data.country}
            </div>
            <div style="margin-bottom: 8px;">
              ${sectorsHtml}
            </div>
            <div style="font-weight: 600; color: #2D3748; border-top: 1px solid #E2E8F0; padding-top: 6px;">
              Total Score: ${d.data.totalScore.toFixed(3)}
            </div>
          `);

        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .style('opacity', 1)
          .style('stroke', '#000')
          .style('stroke-width', '1px');
      })
      .on('mousemove', (event) => {
        const containerRect = containerRef.current!.getBoundingClientRect();
        const svgRect = svgRef.current!.getBoundingClientRect();
        const tooltipNode = tooltipRef.current!;

        // Get the position relative to the SVG
        const xPos = event.clientX - svgRect.left;
        const yPos = event.clientY - svgRect.top;

        // Calculate the position for the tooltip
        let left = xPos + margin.left + 16;
        let top = yPos;

        // Adjust if tooltip would go off the right edge
        if (left + tooltipNode.offsetWidth > containerRect.width) {
          left = xPos - tooltipNode.offsetWidth - 16;
        }

        // Adjust if tooltip would go off the top or bottom
        if (top + tooltipNode.offsetHeight > containerRect.height) {
          top = containerRect.height - tooltipNode.offsetHeight - 8;
        }
        if (top < 0) {
          top = 8;
        }

        tooltip.style('left', `${left}px`).style('top', `${top}px`);
      })
      .on('mouseout', (event) => {
        tooltip.style('visibility', 'hidden');

        const currentSector = sectors[d3.select(event.currentTarget.parentNode).datum().index];
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .style('opacity', () => {
            if (selectedCountry && event.target.__data__.data.country !== selectedCountry)
              return 0.3;
            if (selectedSector && currentSector !== selectedSector) return 0.3;
            return 1;
          })
          .style('stroke', 'none');
      });

    // Update legend with transitions
    const legend = svg.select('.legend');
    if (legend.empty()) {
      const newLegend = svg
        .append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - margin.right + 20},${margin.top})`);

      sectors.forEach((sector, i) => {
        const legendItem = newLegend.append('g').attr('transform', `translate(0,${i * 20})`);

        legendItem
          .append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', sectorColors[sector])
          .style('opacity', selectedSector && selectedSector !== sector ? 0.3 : 1);

        legendItem
          .append('text')
          .attr('x', 20)
          .attr('y', 12)
          .text(sectorNames[sector])
          .style('font-family', "'Inter', 'Helvetica', 'Arial', sans-serif")
          .style('font-size', '12px')
          .style('font-weight', '500')
          .style('opacity', selectedSector && selectedSector !== sector ? 0.3 : 1);
      });
    } else {
      legend
        .selectAll('rect')
        .transition()
        .duration(750)
        .style('opacity', (d) => (selectedSector && selectedSector !== d ? 0.3 : 1));

      legend
        .selectAll('text')
        .transition()
        .duration(750)
        .style('opacity', (d) => (selectedSector && selectedSector !== d ? 0.3 : 1));
    }
  }, [data, selectedSector, selectedCountry, onCountrySelect]);

  return (
    <div ref={containerRef} className="relative">
      <svg ref={svgRef} width="100%" height="400" className="bg-white" />
      <div ref={tooltipRef} className="absolute" />
    </div>
  );
};

export default BarChart;
