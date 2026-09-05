import L from 'leaflet';
import { SeverityLevel } from '../../types';

export const createSeverityIcon = (severity: SeverityLevel | string, isSelected: boolean = false) => {
  const sev = (severity || 'low').toLowerCase();

  let bg = '#10b981'; // low = green
  let border = '#047857';
  let shadow = 'rgba(16, 185, 129, 0.4)';

  if (sev === 'high') {
    bg = '#ef4444'; // high = red
    border = '#b91c1c';
    shadow = 'rgba(239, 68, 68, 0.5)';
  } else if (sev === 'medium') {
    bg = '#f59e0b'; // medium = amber
    border = '#b45309';
    shadow = 'rgba(245, 158, 11, 0.5)';
  }

  const size = isSelected ? 32 : 24;
  const innerDotSize = isSelected ? 10 : 6;
  const borderWidth = isSelected ? 3 : 2;

  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${bg};
        border: ${borderWidth}px solid ${isSelected ? '#ffffff' : border};
        box-shadow: 0 0 ${isSelected ? '14px' : '6px'} ${shadow};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.15s ease-in-out;
      " aria-label="${sev} severity marker">
        <div style="
          width: ${innerDotSize}px;
          height: ${innerDotSize}px;
          background: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};
