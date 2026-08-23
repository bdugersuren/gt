'use client';
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize Mermaid.js configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
});

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const [svg, setSvg] = useState<string>('');
  const id = useRef(`mermaid-${Math.floor(Math.random() * 100000)}`);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      try {
        const { svg } = await mermaid.render(id.current, chart);
        if (isMounted) {
          setSvg(svg);
        }
      } catch (err) {
        console.error('[Mermaid] Chart render error:', err);
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  return (
    <div
      className="mermaid-chart flex justify-center my-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto"
      dangerouslySetInnerHTML={{
        __html: svg || '<span class="text-sm text-slate-400">Диаграмм ачаалж байна...</span>',
      }}
    />
  );
}
