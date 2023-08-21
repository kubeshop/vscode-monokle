import {machineIdSync} from 'node-machine-id';
import {Analytics} from '@segment/analytics-node';
import {env} from 'vscode';
import logger from './logger';
import globals from './globals';

let client: Analytics | undefined;

const getSegmentClient = () => {
  if (!env.isTelemetryEnabled || !globals.telemetryEnabled ) {
    closeClient();
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

export function trackEvent<TEvent extends Event>(eventName: TEvent, payload?: EventMap[TEvent]) {
  const segmentClient = getSegmentClient();

  logger.log('Track event', machineId, eventName, payload);

  segmentClient?.track({
    event: eventName,
    properties: payload,
    userId: machineId,
  });
};

export async function closeClient() {
  if (client) {
    logger.log('Close Segment client');
    await client.closeAndFlush();
    client = undefined;
  }
}

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
  'workspace/validate': BaseEvent & {
    resourceCount?: number,
    configurationType?: string,
    isValidConfiguration?: boolean,
    validationWarnings?: number,
    validationErrors?: number,
  };
  // When policy is synced from Monokle Cloud.
  'policy/synchronize': BaseEvent & {errorCode?: string};
};
