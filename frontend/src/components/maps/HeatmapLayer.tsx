import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { HeatmapPoint } from '../../types';

export interface HeatmapLayerProps {
  points: HeatmapPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  points,
  radius = 25,
  blur = 15,
  maxZoom = 18,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points) return;

    // Form array format required by leaflet.heat: [lat, lng, intensity]
    const heatPoints: [number, number, number][] = points.map((p) => [
      p.latitude,
      p.longitude,
      p.weight || 1,
    ]);

    let heatLayer: any = null;

    if (typeof (L as any).heatLayer === 'function') {
      try {
        heatLayer = (L as any).heatLayer(heatPoints, {
          radius,
          blur,
          maxZoom,
          gradient: {
            0.2: '#3b82f6', // blue (low)
            0.5: '#eab308', // yellow (medium)
            0.8: '#f97316', // orange (high)
            1.0: '#ef4444', // red (critical)
          },
        });
        heatLayer.addTo(map);
      } catch (err) {
        console.warn('Failed to initialize Leaflet heat layer:', err);
      }
    }

    return () => {
      if (heatLayer && map) {
        try {
          map.removeLayer(heatLayer);
        } catch (_) {
          // ignore removal errors during unmount
        }
      }
    };
  }, [map, points, radius, blur, maxZoom]);

  return null;
};
