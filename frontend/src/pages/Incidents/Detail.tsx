import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Marker } from 'react-leaflet';
import { incidentsApi } from '../../api/incidents';
import { Incident, IncidentEvidence } from '../../types';
import { MapContainer } from '../../components/maps/MapContainer';
import { createSeverityIcon } from '../../components/maps/markerUtils';
import { ResolveConfirmModal } from '../../components/incidents/ResolveConfirmModal';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Spinner } from '../../components/ui/Spinner';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Cpu,
  Bus as BusIcon,
  Route as RouteIcon,
  Film,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { formatDateTime, getErrorMessage } from '../../utils/formatters';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [evidence, setEvidence] = useState<IncidentEvidence | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('Unable to load incident data.');

  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState<boolean>(false);

  const fetchIncidentDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    setMutationError(null);
    try {
      const incData = await incidentsApi.getIncidentById(id);
      setIncident(incData);

      // Attempt to load evidence
      try {
        const evData = await incidentsApi.getEvidence(id);
        setEvidence(evData);
      } catch (evErr) {
        console.warn('No evidence record returned for incident:', evErr);
        setEvidence(null);
      }
    } catch (err: any) {
      console.error('Failed to load incident detail:', err);
      setIsError(true);
      if (err.response?.status === 404) {
        setErrorMessage('Incident not found.');
      } else if (err.response?.status === 403) {
        setErrorMessage("You don't have permission to view this incident.");
      } else {
        setErrorMessage(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncidentDetails();
  }, [fetchIncidentDetails]);

  // Execute Status Mutation
  const handleUpdateStatus = async (newStatus: 'acknowledged' | 'resolved') => {
    if (!id) return;
    setIsMutating(true);
    setMutationError(null);
    try {
      const updated = await incidentsApi.updateIncident(id, { status: newStatus });
      setIncident(updated);
      setIsResolveModalOpen(false);
    } catch (err: any) {
      console.error('Status update failed:', err);
      const status = err.response?.status;
      if (status === 409) {
        setMutationError('That status change is no longer valid.');
      } else if (status === 403) {
        setMutationError("You don't have permission to update this incident.");
      } else if (status === 422) {
        setMutationError('Please check the submitted information.');
      } else {
        setMutationError(getErrorMessage(err));
      }
    } finally {
      setIsMutating(false);
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

  const getStatusBadgeVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'danger';
      case 'acknowledged':
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
            Loading Incident File...
          </span>
        </div>
      </div>
    );
  }

  if (isError || !incident) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/incidents')}
          className="font-mono text-xs gap-1 border-slate-700 text-slate-300"
          aria-label="Back to Incidents"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Incidents
        </Button>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="py-12">
            <ErrorState
              title={errorMessage}
              message="Check incident ID or network status."
              onRetry={fetchIncidentDetails}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const recordingMeta = evidence?.recordingMetadata;
  const videoUrl = recordingMeta?.filePath || null;

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/incidents')}
            className="font-mono text-xs gap-1 border-slate-700 text-slate-300 hover:bg-slate-800"
            aria-label="Back to Incidents"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono text-white tracking-wide">
                Incident: {incident.id}
              </h1>
              <Badge variant={getSeverityBadgeVariant(incident.severity)}>
                {incident.severity?.toUpperCase()}
              </Badge>
              <Badge variant={getStatusBadgeVariant(incident.status)}>
                {incident.status?.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Type: <span className="text-slate-200 font-semibold">{incident.incidentType}</span>
            </p>
          </div>
        </div>

        {/* Action Workflow Controls */}
        <div className="flex items-center gap-2">
          {incident.status === 'open' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUpdateStatus('acknowledged')}
                disabled={isMutating}
                className="font-mono text-xs border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                aria-label="Acknowledge Incident"
              >
                Acknowledge
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsResolveModalOpen(true)}
                disabled={isMutating}
                className="font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                aria-label="Resolve Incident"
              >
                Resolve Incident
              </Button>
            </>
          )}

          {incident.status === 'acknowledged' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsResolveModalOpen(true)}
              disabled={isMutating}
              className="font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
              aria-label="Resolve Incident"
            >
              Resolve Incident
            </Button>
          )}

          {incident.status === 'resolved' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <ShieldCheck className="h-4 w-4" />
              <span>Resolved</span>
            </div>
          )}
        </div>
      </div>

      {/* Mutation Error Alert */}
      {mutationError && (
        <div className="rounded bg-red-500/10 border border-red-500/30 p-3 text-xs font-mono text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{mutationError}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Incident Info & Telematics */}
        <div className="lg:col-span-7 space-y-6">
          {/* Incident Telemetry Card */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
                Incident Telemetry File
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Event ID</span>
                  <span className="text-slate-200 font-semibold">{incident.eventId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Confidence</span>
                  <span className="text-slate-200 font-semibold text-sm">
                    {Math.round((incident.confidence || 0) * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Sensed Time</span>
                  <span className="text-slate-200">{formatDateTime(incident.timestamp)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Current Status</span>
                  <Badge variant={getStatusBadgeVariant(incident.status)} className="mt-0.5">
                    {incident.status?.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {incident.description && (
                <div className="border-t border-slate-800 pt-3">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase mb-1">
                    Operational Notes / Description
                  </span>
                  <p className="text-xs font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                    {incident.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Telematics Identifiers Card */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
                Telematics & Asset Identifiers
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase mb-1">
                    <Cpu className="h-3.5 w-3.5 text-emerald-400" /> Device ID
                  </div>
                  <span className="text-slate-200 font-bold">{incident.deviceId || 'N/A'}</span>
                </div>

                <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase mb-1">
                    <BusIcon className="h-3.5 w-3.5 text-amber-400" /> Bus ID
                  </div>
                  <span className="text-slate-200 font-bold">{incident.busId || 'N/A'}</span>
                </div>

                <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase mb-1">
                    <RouteIcon className="h-3.5 w-3.5 text-blue-400" /> Route ID
                  </div>
                  <span className="text-slate-200 font-bold">{incident.routeId || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evidence Section Card */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
                  Recording Evidence Metadata
                </h3>
                <Film className="h-4 w-4 text-blue-400" />
              </div>

              {incident.recordingId || evidence?.recordingId ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Recording ID</span>
                      <span className="text-slate-200 font-semibold">
                        {incident.recordingId || evidence?.recordingId}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Evidence Status</span>
                      <span className="text-emerald-400 font-semibold">
                        {recordingMeta?.status || 'AVAILABLE'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {(recordingMeta?.id || incident.recordingId) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/recordings/${recordingMeta?.id || incident.recordingId}`)}
                        className="font-mono text-xs gap-1.5 border-slate-700 text-blue-400 hover:text-blue-300"
                        aria-label="View Recording Evidence"
                      >
                        <Film className="h-3.5 w-3.5" />
                        View Recording Evidence Page
                      </Button>
                    )}

                    {videoUrl && (
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-mono text-blue-400 hover:text-blue-300 underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Video Stream ({videoUrl})
                      </a>
                    )}
                  </div>

                  {!videoUrl && (
                    <div className="p-2.5 rounded bg-slate-950/40 text-slate-400 text-xs font-mono italic border border-slate-800/60">
                      Video unavailable for streaming. Recording metadata verified.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded bg-slate-950/40 text-slate-500 text-xs font-mono border border-slate-800/60">
                  No recording evidence attached to this incident.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Mini Map Location */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
                  Geospatial Incident Location
                </h3>
                <MapPin className="h-4 w-4 text-red-400" />
              </div>

              {incident.location ? (
                <>
                  <MapContainer
                    center={[incident.location.latitude, incident.location.longitude]}
                    zoom={15}
                    height="320px"
                  >
                    <Marker
                      position={[incident.location.latitude, incident.location.longitude]}
                      icon={createSeverityIcon(incident.severity, true)}
                    />
                  </MapContainer>

                  <div className="bg-slate-950/60 p-3 rounded border border-slate-800 font-mono text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Latitude:</span>
                      <span className="text-slate-200 font-semibold">{incident.location.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Longitude:</span>
                      <span className="text-slate-200 font-semibold">{incident.location.longitude.toFixed(6)}</span>
                    </div>
                    {incident.location.accuracyMeters !== undefined && incident.location.accuracyMeters !== null && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Telemetry Accuracy:</span>
                        <span className="text-slate-300">±{incident.location.accuracyMeters} meters</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  No GPS coordinates available for this incident.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ResolveConfirmModal
        isOpen={isResolveModalOpen}
        incidentId={incident.id}
        onConfirm={() => handleUpdateStatus('resolved')}
        onCancel={() => setIsResolveModalOpen(false)}
        isSubmitting={isMutating}
      />
    </div>
  );
};
