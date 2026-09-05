import React from 'react';
import { MapContainer as LeafletMap, TileLayer } from 'react-leaflet';
import { Spinner } from '../ui/Spinner';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { MapPin } from 'lucide-react';

export interface MapContainerProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  errorMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  center = [17.385044, 78.486671], // Hyderabad default coordinates
  zoom = 13,
  height = '500px',
  isLoading = false,
  isError = false,
  isEmpty = false,
  errorMessage = 'Could not load map tile services. Check connection.',
  emptyTitle = 'No Map Telemetry Found',
  emptyMessage = 'Adjust bounding box parameters or search criteria.',
  onRetry,
  children,
}) => {
  return (
    <div
      className="relative w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      style={{ height }}
    >
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex flex-col items-center gap-2">
            <Spinner size="lg" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              Initializing Spatial Grid...
            </span>
          </div>
        </div>
      ) : isError ? (
        <div className="flex h-full w-full items-center justify-center p-4">
          <ErrorState
            title="Unable to load map data."
            message={errorMessage}
            onRetry={onRetry}
          />
        </div>
      ) : isEmpty ? (
        <div className="flex h-full w-full items-center justify-center p-4">
          <EmptyState
            title={emptyTitle}
            description={emptyMessage}
            icon={<MapPin className="h-10 w-10 text-slate-400" />}
          />
        </div>
      ) : (
        <LeafletMap
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {children}
        </LeafletMap>
      )}
    </div>
  );
};
