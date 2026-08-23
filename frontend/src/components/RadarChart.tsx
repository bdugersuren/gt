'use client';
import React from 'react';

interface RadarData {
  subject: string;
  score: number;
  fullMark: number;
}

interface RadarChartProps {
  data: RadarData[];
}

export function RadarChart({ data }: RadarChartProps) {
  // Ensure at least 3 points for a polygon to draw properly
  const displayData = [...data];
  while (displayData.length < 3) {
    displayData.push({
      subject: `Хяналт ${displayData.length + 1}`,
      score: 0,
      fullMark: 100,
    });
  }

  const cx = 150;
  const cy = 150;
  const r = 90;
  const total = displayData.length;

  // Helper to get coordinates
  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const distance = r * (value / 100);
    const x = cx + distance * Math.cos(angle);
    const y = cy + distance * Math.sin(angle);
    return { x, y };
  };

  // 1. Grid Polygons (levels: 20%, 40%, 60%, 80%, 100%)
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPolygons = gridLevels.map((level) => {
    return displayData
      .map((_, i) => {
        const { x, y } = getCoordinates(i, level);
        return `${x},${y}`;
      })
      .join(' ');
  });

  // 2. Data Polygon points
  const dataPoints = displayData
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.score);
      return `${x},${y}`;
    })
    .join(' ');

  // 3. Labels and Radial lines
  const labelsAndLines = displayData.map((d, i) => {
    const outerCoord = getCoordinates(i, 100);
    const labelCoord = getCoordinates(i, 118); // slightly further out for labels
    
    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
    if (labelCoord.x < cx - 15) textAnchor = 'end';
    else if (labelCoord.x > cx + 15) textAnchor = 'start';

    return {
      subject: d.subject,
      score: d.score,
      line: outerCoord,
      label: labelCoord,
      textAnchor,
    };
  });

  return (
    <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm w-full">
      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
        Чадамжийн Зураглал (Competencies Radar)
      </h3>
      <div className="relative w-[300px] h-[300px]">
        <svg width="300" height="300" className="overflow-visible">
          {/* Render grid levels */}
          {gridPolygons.map((points, idx) => (
            <polygon
              key={idx}
              points={points}
              fill="none"
              stroke="#e2e8f0"
              className="dark:stroke-slate-800"
              strokeWidth="1"
              strokeDasharray={idx === 4 ? '0' : '2 2'}
            />
          ))}

          {/* Render radial lines */}
          {labelsAndLines.map((item, idx) => (
            <line
              key={idx}
              x1={cx}
              y1={cy}
              x2={item.line.x}
              y2={item.line.y}
              stroke="#cbd5e1"
              className="dark:stroke-slate-800"
              strokeWidth="1"
            />
          ))}

          {/* Render data polygon */}
          <polygon
            points={dataPoints}
            fill="rgba(13, 148, 136, 0.15)"
            stroke="#0d9488"
            strokeWidth="2"
            className="transition-all duration-300"
          />

          {/* Render data points */}
          {displayData.map((d, i) => {
            const { x, y } = getCoordinates(i, d.score);
            return (
              <g key={i} className="group cursor-pointer">
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#0d9488"
                  stroke="#fff"
                  strokeWidth="1.5"
                  className="transition-all duration-200 hover:scale-150"
                />
                <title>{`${d.subject}: ${d.score}%`}</title>
              </g>
            );
          })}

          {/* Render labels */}
          {labelsAndLines.map((item, idx) => (
            <text
              key={idx}
              x={item.label.x}
              y={item.label.y + 3}
              textAnchor={item.textAnchor}
              className="text-[9px] font-bold fill-slate-500 dark:fill-slate-400 select-none"
            >
              {item.subject}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
