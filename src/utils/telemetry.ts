import {machineIdSync} from 'node-machine-id';
import {Analytics} from '@segment/analytics-node';
import {env} from 'vscode';
import logger from './logger';
import globals from './globals';

let client: Analytics | undefined;

const getSegmentClient = () => {
  if (!env.isTelemetryEnabled || !globals.telemetryEnabled ) {
    client = undefined;
    return undefined;
  }

  if (!client) {
    enableSegment();
  }

  return client;
};

const enableSegment = () => {
  if (process.env.SEGMENT_API_KEY) {
    logger.log('Enabled Segment');
    client = new Analytics({writeKey: process.env.SEGMENT_API_KEY});
  }
};

const machineId: string = machineIdSync();

export const trackEvent = <TEvent extends Event>(eventName: TEvent, payload?: EventMap[TEvent]) => {
  const segmentClient = getSegmentClient();

  logger.log('Track event', machineId, eventName, payload);

  segmentClient?.track({
    event: eventName,
    properties: payload,
    userId: machineId,
  });
};

export type EventStatus = 'started' | 'success' | 'failure' | 'cancelled';
export type BaseEvent = {status: EventStatus, error?: string};

export type Event = keyof EventMap;
export type EventMap = {
  'ext/installed': BaseEvent & {appVersion: string; deviceOS: string};
  'ext/session': BaseEvent & {appVersion: string};
  'ext/session_end': BaseEvent & {timeSpent: number};
  'command/login': BaseEvent & {method?: string};
  'command/logout': BaseEvent;
  'command/validate': BaseEvent & {rootCount?: number};
  'command/show_panel': BaseEvent;
  'command/show_configuration': BaseEvent & {configurationType?: string};
  'command/bootstrap_configuration': BaseEvent & {configurationType?: string};
  'command/synchronize': BaseEvent;
  'config/change': BaseEvent & {name: string; value: string};
  // When new folder is added/removed to/from VSC workspace.
  'workspace/change': BaseEvent & {rootCount: number};
  // When validation is completed for a workspace, usually triggered by file modification.
  'workspace/validate': BaseEvent & {configurationType: string, isValidConfiguration: boolean};
  // When policy is synced from Monokle Cloud.
  'policy/sync': BaseEvent;
};
