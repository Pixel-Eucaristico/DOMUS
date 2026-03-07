import { BREAKPOINTS, CONTENT_MAX_WIDTH, GRID_COLUMNS, type DeviceType } from '../constants/breakpoints';

export function getDeviceType(width: number): DeviceType {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

export function getColumns(deviceType: DeviceType): number {
  return GRID_COLUMNS[deviceType];
}

export function getContentMaxWidth(deviceType: DeviceType): number | string {
  return CONTENT_MAX_WIDTH[deviceType];
}

export function isSidebarEnabled(deviceType: DeviceType): boolean {
  return deviceType === 'desktop';
}
