import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { LoginPage } from '../pages/Login/Index';
import { DashboardPage } from '../pages/Dashboard/Index';
import { MapPage } from '../pages/Map/Index';
import { IncidentsPage } from '../pages/Incidents/Index';
import { IncidentDetailPage } from '../pages/Incidents/Detail';
import { AlertsPage } from '../pages/Alerts/Index';
import { AnalyticsPage } from '../pages/Analytics/Index';
import { FleetPage } from '../pages/Fleet/Index';
import { RecordingsPage } from '../pages/Recordings/Index';
import { RecordingDetailPage } from '../pages/Recordings/Detail';
import { SettingsPage } from '../pages/Settings/Index';
import { AdminPage } from '../pages/Admin/Index';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'map',
        element: <MapPage />,
      },
      {
        path: 'incidents',
        element: <IncidentsPage />,
      },
      {
        path: 'incidents/:id',
        element: <IncidentDetailPage />,
      },
      {
        path: 'alerts',
        element: <AlertsPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
      {
        path: 'fleet',
        element: <FleetPage />,
      },
      {
        path: 'recordings',
        element: <RecordingsPage />,
      },
      {
        path: 'recordings/:id',
        element: <RecordingDetailPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
