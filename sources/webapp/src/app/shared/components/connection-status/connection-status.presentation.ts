import {
  LucideCircleCheck,
  LucideCirclePause,
  LucideCloudAlert,
  LucideCloudOff,
  LucideIconData,
  LucideLockKeyhole,
  LucideRefreshCw,
} from '@lucide/angular';
import { GlobalConnectionStatus } from './connection-status.model';

interface StatusPresentation {
  icon: LucideIconData;
  color: 'success' | 'warning' | 'error';
  label: string;
  spinning?: boolean;
}

export const CONNECTION_STATUS_PRESENTATION: Record<
  GlobalConnectionStatus,
  StatusPresentation
> = {
  offline: {
    icon: LucideCloudOff.icon,
    color: 'warning',
    label: 'workspace.connection.offline',
  },
  'sign-in-required': {
    icon: LucideLockKeyhole.icon,
    color: 'warning',
    label: 'workspace.connection.signInRequired',
  },
  synced: {
    icon: LucideCircleCheck.icon,
    color: 'success',
    label: 'workspace.connection.synced',
  },
  syncing: {
    icon: LucideRefreshCw.icon,
    color: 'success',
    label: 'workspace.connection.syncing',
    spinning: true,
  },
  'sync-disabled': {
    icon: LucideCirclePause.icon,
    color: 'warning',
    label: 'workspace.connection.syncDisabled',
  },
  'sync-error': {
    icon: LucideCloudAlert.icon,
    color: 'error',
    label: 'workspace.connection.syncError',
  },
};
