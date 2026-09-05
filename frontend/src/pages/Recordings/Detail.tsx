import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Marker } from 'react-leaflet';
import { PageHeader } from '../../components/common/PageHeader';
import { MapContainer } from '../../components/maps/MapContainer';
import { createSeverityIcon } from '../../components/maps/markerUtils';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Spinner } from '../../components/ui/Spinner';
import { recordingsApi } from '../../api/recordings';
import { Recording, Incident } from '../../types';
import { formatDateTime, formatDuration, formatFileSize, getErrorMessage } from '../../utils/formatters';
import {
  ArrowLeft,
  Film,
  Clock,
  MapPin,
  Cpu,
  Bus as BusIcon,
  Route as RouteIcon,
  AlertTriangle,
  ExternalLink,
  VideoOff,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const RecordingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('Unable to load recording data.');
  const [videoPlayError, setVideoPlayError] = useState<boolean>(false);

  const fetchRecordingDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    setVideoPlayError(false);
    try {
      const recData = await recordingsApi.getRecordingById(id);
      setRecording(recData);

      try {
        const incData = await recordingsApi.getRecordingIncidents(id);
        setIncidents(incData.items || []);
      } catch (incErr) {
        console.warn('No incidents returned for recording:', incErr);
        setIncidents([]);
      }
    } catch (err: any) {
      console.error('Failed to load recording details:', err);
      setIsError(true);
      if (err.response?.status === 404) {
        setErrorMessage('Recording not found.');
      } else if (err.response?.status === 403) {
        setErrorMessage("You don't have permission to view this recording.");
      } else {
        setErrorMessage(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecordingDetail();
  }, [fetchRecordingDetail]);

  const isStreamableUrl = (url?: string | null): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('blob:') ||
      lower.startsWith('/video/')
    );
  };

  const getStatusVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'processed':
      case 'uploaded':
        return 'success';
      case 'uploading':
      case 'processing':
        return 'warning';
      case 'failed':
      case 'error':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getSeverityBadgeVariant = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Spinner size="lg" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
            Loading Recording Evidence File...
          </span>
        </div>
      </div>
    );
  }

  if (isError || !recording) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/recordings')}
          className="font-mono text-xs gap-1 border-slate-700 text-slate-300"
          aria-label="Back to Recordings"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Recordings
        </Button>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="py-12">
            <ErrorState
              title={errorMessage}
              description="Check recording ID or session permissions."
              onRetry={fetchRecordingDetail}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter incidents with location coordinates
  const incidentsWithLocation = incidents.filter(
    (inc) => inc.location && inc.location.latitude && inc.location.longitude
  );

  const canStreamVideo = isStreamableUrl(recording.filePath) && !videoPlayError;

  return (
    <div className="space-y-6">
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/recordings')}
            className="font-mono text-xs gap-1 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Back to Recordings"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono text-slate-900 dark:text-white tracking-wide">
                Recording Evidence: {recording.recordingId}
              </h1>
              <Badge variant={getStatusVariant(recording.status)}>
                {recording.status?.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Review sensing recordings and their associated incident evidence.
            </p>
          </div>
        </div>
      </div>

      {/* Main Evidence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Video Player & Metadata Cards */}
        <div className="lg:col-span-7 space-y-6">
          {/* Video Player Card */}
          <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Film className="h-4 w-4 text-blue-500" /> Dashcam Evidence Player
              </h3>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {recording.durationSeconds ? formatDuration(recording.durationSeconds) : 'N/A'}
              </span>
            </div>

            <CardContent className="p-4">
              {canStreamVideo ? (
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-slate-800">
                  <video
                    data-testid="video-player"
                    src={recording.filePath!}
                    controls
                    className="w-full h-full object-contain"
                    onError={() => setVideoPlayError(true)}
                  >
                    Your browser does not support HTML5 video playback.
                  </video>
                </div>
              ) : (
                <div className="p-8 rounded-lg bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <div className="p-3 rounded-full bg-slate-200 dark:bg-slate-800/60 w-fit mx-auto text-slate-500">
                    <VideoOff className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                      Video unavailable for streaming.
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      Video file is not directly streamable via HTTP stream or has not been uploaded yet. Metadata remains verified.
                    </p>
                  </div>
                  {recording.filePath && (
                    <div className="pt-2">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">File Path Metadata</span>
                      <code className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-900 px-3 py-1 rounded inline-block border border-slate-300 dark:border-slate-800 break-all">
                        {recording.filePath}
                      </code>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recording Telematics Metadata */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                Recording Metadata & Telematics
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Recording ID</span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">{recording.recordingId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Device ID</span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">{recording.deviceId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Bus ID</span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">{recording.busId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Route ID</span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">{recording.routeId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Start Time</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatDateTime(recording.startTime)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">End Time</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatDateTime(recording.endTime)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Duration</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatDuration(recording.durationSeconds)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">File Size</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatFileSize(recording.fileSizeBytes)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evidence Timeline */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" /> Operational Evidence Timeline
              </h3>

              <div className="space-y-3 pt-2">
                {/* Recording Start */}
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 min-w-[120px]">
                    Recording Start:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">{formatDateTime(recording.startTime)}</span>
                </div>

                {/* Sensed Incidents in Timeline */}
                {incidents.map((inc) => (
                  <div key={inc.id} className="flex items-center gap-3 text-xs font-mono pl-3 border-l-2 border-amber-500/50 ml-1 py-1">
                    <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="font-semibold text-amber-600 dark:text-amber-400 min-w-[120px]">
                      Incident Sensed:
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">{formatDateTime(inc.timestamp)}</span>
                    <span className="text-slate-500">({inc.incidentType})</span>
                  </div>
                ))}

                {/* Recording End */}
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 min-w-[120px]">
                    Recording End:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">{formatDateTime(recording.endTime)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Associated Incidents & Location Map */}
        <div className="lg:col-span-5 space-y-6">
          {/* Associated Incidents Card */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Associated Incidents ({incidents.length})
              </h3>
            </div>

            <CardContent className="p-0">
              {incidents.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                  No incidents associated with this recording.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3 py-2">Incident ID</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Severity</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {incidents.map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                            {inc.id}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">
                            {inc.incidentType}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={getSeverityBadgeVariant(inc.severity)}>
                              {inc.severity?.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={inc.status === 'open' ? 'danger' : 'success'}>
                              {inc.status?.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Link
                              to={`/incidents/${inc.id}`}
                              aria-label={`View Incident ${inc.id}`}
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              <ExternalLink className="h-3 w-3" /> View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Geospatial Evidence Map */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" /> Evidence Location Map
                </h3>
              </div>

              {incidentsWithLocation.length > 0 ? (
                <>
                  <MapContainer
                    center={[
                      incidentsWithLocation[0].location!.latitude,
                      incidentsWithLocation[0].location!.longitude,
                    ]}
                    zoom={15}
                    height="280px"
                  >
                    {incidentsWithLocation.map((inc) => (
                      <Marker
                        key={inc.id}
                        position={[inc.location!.latitude, inc.location!.longitude]}
                        icon={createSeverityIcon(inc.severity, true)}
                      />
                    ))}
                  </MapContainer>

                  <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Incident GPS Coordinates:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">
                        {incidentsWithLocation[0].location!.latitude.toFixed(6)},{' '}
                        {incidentsWithLocation[0].location!.longitude.toFixed(6)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 font-mono text-xs italic">
                  No location available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
