import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { CountryData } from '../types';
import { sectorColors, sectorNames } from '../utils/constants';

interface Props {
  data: CountryData[];
  selectedSector: string | null;
  onSectorSelect: (sector: string | null) => void;
}

const PieChart: React.FC<Props> = ({ data, selectedSector, onSectorSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const width = svgRef.current.clientWidth;
    const height = 400;
    const radius = Math.min(width, height) / 3.5; // Reduced radius to leave more space for labels

    const svg = d3.select(svgRef.current);
    
    // Only clear if no previous elements exist
    if (svg.select("g").empty()) {
      svg.selectAll("*").remove();
      svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);
    }

    const g = svg.select("g");

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("padding", "12px")
      .style("border", "1px solid #ddd")
      .style("border-radius", "6px")
      .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.15)")
      .style("pointer-events", "none")
      .style("font-family", "'Inter', 'Helvetica', 'Arial', sans-serif")
      .style("font-size", "14px")
      .style("z-index", "1000");

    // Calculate average scores for each sector
    const sectorAverages = Object.keys(data[0].sectorScores).reduce((acc, sector) => {
      const avg = d3.mean(data, d => d.sectorScores[sector]) || 0;
      return { ...acc, [sector]: avg };
    }, {} as Record<string, number>);

    // Create pie data
    const pie = d3.pie<[string, number]>()
      .value(d => d[1])
      .sort(null);

    const pieData = pie(Object.entries(sectorAverages));

    // Create arc generators
    const arc = d3.arc<d3.PieArcDatum<[string, number]>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);

    // Create outer arc for labels
    const outerArc = d3.arc<d3.PieArcDatum<[string, number]>>()
      .innerRadius(radius * 1.1)
      .outerRadius(radius * 1.1);

    // Update arcs with transitions
    const arcs = g.selectAll(".arc")
      .data(pieData);

    // Remove old arcs
    arcs.exit().remove();

    // Add new arcs
    const arcsEnter = arcs.enter()
      .append("g")
      .attr("class", "arc");

    arcsEnter.append("path")
      .attr("d", arc as any)
      .attr("fill", d => sectorColors[d.data[0]])
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .style("opacity", 0);

    // Merge and transition all arcs
    arcs.merge(arcsEnter).select("path")
      .transition()
      .duration(750)
      .ease(d3.easeQuadOut)
      .attrTween("d", function(d) {
        const interpolate = d3.interpolate(this._current || d, d);
        this._current = interpolate(0);
        return (t: number) => arc(interpolate(t)) as string;
      })
      .style("opacity", d => selectedSector === d.data[0] ? 1 : selectedSector ? 0.3 : 1);

    // Add interactivity
    g.selectAll(".arc").select("path")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        onSectorSelect(selectedSector === d.data[0] ? null : d.data[0]);
      })
      .on("mouseover", (event, d) => {
        const sector = d.data[0];
        const value = d.data[1];
        
        tooltip
          .style("visibility", "visible")
          .html(`
            <div style="font-weight: 700; margin-bottom: 8px; color: #1A202C; font-size: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
              ${sectorNames[sector]}
            </div>
            <div style="margin-bottom: 4px;">
              Average Score: ${value.toFixed(3)}
            </div>
            ${data.length === 1 ? `<div>Country Score: ${data[0].sectorScores[sector].toFixed(3)}</div>` : ''}
          `);

        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("transform", "scale(1.05)");

        // Highlight the label - store the sector to use for filtering
        const currentSector = sector;
        g.selectAll(".sector-label")
          .filter(function() {
            // Get the data associated with this element
            const labelData = d3.select(this).datum() as d3.PieArcDatum<[string, number]>;
            return labelData && labelData.data[0] === currentSector;
          })
          .transition()
          .duration(200)
          .style("font-weight", "700")
          .style("font-size", "15px");
      })
      .on("mousemove", (event) => {
        const tooltipNode = tooltip.node() as HTMLDivElement;
        const tooltipWidth = tooltipNode.offsetWidth;
        const tooltipHeight = tooltipNode.offsetHeight;
        
        // Get mouse position relative to the document
        const [mouseX, mouseY] = d3.pointer(event, document.body);
        
        // Position tooltip to avoid going off screen
        let left = mouseX + 16;
        let top = mouseY - tooltipHeight / 2;
        
        // Adjust if tooltip would go off the right edge
        if (left + tooltipWidth > window.innerWidth) {
          left = mouseX - tooltipWidth - 16;
        }
        
        // Adjust if tooltip would go off the top or bottom
        if (top < 0) {
          top = 10;
        } else if (top + tooltipHeight > window.innerHeight) {
          top = window.innerHeight - tooltipHeight - 10;
        }
        
        tooltip
          .style("left", `${left}px`)
          .style("top", `${top}px`);
      })
      .on("mouseout", (event, d) => {
        tooltip.style("visibility", "hidden");
        
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("transform", "scale(1)");

        // Reset label styling - store the sector to use for filtering
        const currentSector = d.data[0];
        g.selectAll(".sector-label")
          .filter(function() {
            // Get the data associated with this element
            const labelData = d3.select(this).datum() as d3.PieArcDatum<[string, number]>;
            return labelData && labelData.data[0] === currentSector;
          })
          .transition()
          .duration(200)
          .style("font-weight", "600")
          .style("font-size", "14px");
      });

    // Remove old labels
    g.selectAll(".sector-label").remove();
    g.selectAll(".sector-line").remove();

    // Calculate the maximum label width to ensure labels fit within container
    const maxLabelWidth = Math.min(width / 2 - radius - 40, 100); // Limit label width

    // Add external labels with lines
    pieData.forEach(d => {
      const pos = outerArc.centroid(d);
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      
      // Calculate position for the label - adjust to ensure it stays within bounds
      // Use a smaller multiplier to keep labels closer to the pie
      const labelDistance = Math.min(width / 2 - 40, radius * 1.2);
      pos[0] = labelDistance * (midAngle < Math.PI ? 1 : -1);
      
      // Calculate the position for the line
      const posLine = arc.centroid(d);
      const posLineOuter = outerArc.centroid(d);
      
      // Adjust the outer point of the line to be closer to the label
      posLineOuter[0] = radius * 1.05 * (midAngle < Math.PI ? 1 : -1);
      
      // Create the line
      g.append("path")
        .attr("class", "sector-line")
        .attr("d", `M${posLine[0]},${posLine[1]}L${posLineOuter[0]},${posLineOuter[1]}L${pos[0]},${pos[1]}`)
        .attr("stroke", sectorColors[d.data[0]])
        .attr("stroke-width", 1.5)
        .attr("fill", "none")
        .style("opacity", selectedSector === d.data[0] ? 1 : selectedSector ? 0.3 : 1);
      
      // Create the label with its data
      const label = g.append("text")
        .attr("class", "sector-label")
        .datum(d) // Store the data with the element
        .attr("transform", `translate(${pos[0]},${pos[1]})`)
        .attr("text-anchor", midAngle < Math.PI ? "start" : "end")
        .attr("dy", "0.35em")
        .style("font-family", "'Inter', 'Helvetica', 'Arial', sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", sectorColors[d.data[0]])
        .style("cursor", "pointer")
        .style("opacity", selectedSector === d.data[0] ? 1 : selectedSector ? 0.3 : 1)
        .text(sectorNames[d.data[0]])
        .on("click", (event, labelData) => {
          onSectorSelect(selectedSector === labelData.data[0] ? null : labelData.data[0]);
        })
        .on("mouseover", (event, labelData) => {
          const sector = labelData.data[0];
          const value = labelData.data[1];
          
          tooltip
            .style("visibility", "visible")
            .html(`
              <div style="font-weight: 700; margin-bottom: 8px; color: #1A202C; font-size: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                ${sectorNames[sector]}
              </div>
              <div style="margin-bottom: 4px;">
                Average Score: ${value.toFixed(3)}
              </div>
              ${data.length === 1 ? `<div>Country Score: ${data[0].sectorScores[sector].toFixed(3)}</div>` : ''}
            `);
  
          // Highlight the arc - store the sector to use for filtering
          const currentSector = sector;
          g.selectAll(".arc path")
            .filter(function() {
              // Get the data associated with this element's parent
              const arcData = d3.select(this.parentNode).datum() as d3.PieArcDatum<[string, number]>;
              return arcData && arcData.data[0] === currentSector;
            })
            .transition()
            .duration(200)
            .attr("transform", "scale(1.05)");
  
          // Highlight the label
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .style("font-weight", "700")
            .style("font-size", "15px");
        })
        .on("mousemove", (event) => {
          const tooltipNode = tooltip.node() as HTMLDivElement;
          const tooltipWidth = tooltipNode.offsetWidth;
          const tooltipHeight = tooltipNode.offsetHeight;
          
          // Get mouse position relative to the document
          const [mouseX, mouseY] = d3.pointer(event, document.body);
          
          // Position tooltip to avoid going off screen
          let left = mouseX + 16;
          let top = mouseY - tooltipHeight / 2;
          
          // Adjust if tooltip would go off the right edge
          if (left + tooltipWidth > window.innerWidth) {
            left = mouseX - tooltipWidth - 16;
          }
          
          // Adjust if tooltip would go off the top or bottom
          if (top < 0) {
            top = 10;
          } else if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - 10;
          }
          
          tooltip
            .style("left", `${left}px`)
            .style("top", `${top}px`);
        })
        .on("mouseout", (event, labelData) => {
          tooltip.style("visibility", "hidden");
          
          // Reset arc styling - store the sector to use for filtering
          const currentSector = labelData.data[0];
          g.selectAll(".arc path")
            .filter(function() {
              // Get the data associated with this element's parent
              const arcData = d3.select(this.parentNode).datum() as d3.PieArcDatum<[string, number]>;
              return arcData && arcData.data[0] === currentSector;
            })
            .transition()
            .duration(200)
            .attr("transform", "scale(1)");
  
          // Reset label styling
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .style("font-weight", "600")
            .style("font-size", "14px");
        });
      
      // Add value below the sector name
      g.append("text")
        .attr("class", "sector-label")
        .datum(d) // Store the data with the element
        .attr("transform", `translate(${pos[0]},${pos[1] + 20})`)
        .attr("text-anchor", midAngle < Math.PI ? "start" : "end")
        .attr("dy", "0.35em")
        .style("font-family", "'Inter', 'Helvetica', 'Arial', sans-serif")
        .style("font-size", "12px")
        .style("fill", "#4A5568")
        .style("opacity", selectedSector === d.data[0] ? 1 : selectedSector ? 0.3 : 1)
        .text(`(${d.data[1].toFixed(3)})`);
    });

    // Add a background rectangle to check the SVG boundaries (for debugging)
    // svg.append("rect")
    //   .attr("width", width)
    //   .attr("height", height)
    //   .attr("fill", "none")
    //   .attr("stroke", "#ccc");

  }, [data, selectedSector, onSectorSelect]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height="400"
        className="bg-white"
        style={{ overflow: "visible" }} // Allow content to overflow for labels
      />
      <div ref={tooltipRef} className="absolute" />
    </div>
  );
};

export default PieChart;