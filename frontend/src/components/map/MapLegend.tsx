import React from 'react';

interface MapLegendProps {
  showHeatmap?: boolean;
}

export const MapLegend: React.FC<MapLegendProps> = ({ showHeatmap = false }) => {
  return (
    <div
      className="absolute bottom-4 left-4 z-[1000] rounded-md border border-slate-800 bg-slate-900/90 p-2.5 shadow-lg backdrop-blur-xs font-mono text-xs max-w-xs"
      aria-label="Map Legend"
    >
      <div className="text-[10px] font-bold uppercase text-slate-300 tracking-wider mb-2">
        Map Legend
      </div>

      {/* Severity Markers */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 border border-red-700 shadow-xs"></span>
          <span className="text-[11px] text-slate-300">High Severity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 border border-amber-700 shadow-xs"></span>
          <span className="text-[11px] text-slate-300">Medium Severity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-emerald-700 shadow-xs"></span>
          <span className="text-[11px] text-slate-300">Low Severity</span>
        </div>
      </div>

      {/* Heatmap Gradient Scale */}
      {showHeatmap && (
        <div className="mt-2.5 border-t border-slate-800 pt-2">
          <div className="text-[10px] text-slate-400 mb-1">Heatmap Intensity</div>
          <div className="h-2 w-full rounded bg-gradient-to-r from-blue-500 via-yellow-500 via-orange-500 to-red-500"></div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span>Low Density</span>
            <span>High Density</span>
          </div>
        </div>
      )}
    </div>
  );
};
