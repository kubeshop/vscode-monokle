import { platform } from 'node:os';
import { join, normalize } from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { env } from 'vscode';
import { closeSegmentClient, getSegmentClient } from './telemetry-client';
import logger from './logger';
import globals from './globals';
import { extensions } from 'vscode';

let sessionTimeStart : number;

// Should be called on extension start or when extension or telemetry gets enabled.
export async function initTelemetry() {
  sessionTimeStart = Date.now();

  const storedMachineId = await readMachineId();
  if (!storedMachineId) {
    await saveMachineId(env.machineId);

    const segmentClient = getSegmentClient();

    if (!segmentClient) {
      return;
    }

    logger.log('Identify user', env.machineId);

    segmentClient.identify({
      userId: env.machineId,
    });

    trackEvent('ext/installed', {
      status: 'success',
      appVersion: getAppVersion(),
      deviceOS: platform(),
    });
  }

  trackEvent('ext/session', {
    status: 'success',
    appVersion: getAppVersion(),
    startTimeMs: sessionTimeStart,
  });
}

// Should be called on extension stop, when extension gets disabled or when telemetry gets disabled.
export async function closeTelemetry() {
  const sessionTimeEnd = Date.now();
  trackEvent('ext/session_end', {
    status: 'success',
    endTimeMs: sessionTimeEnd,
    timeSpentSec: Math.ceil((sessionTimeEnd - sessionTimeStart) / 1000),
  });

  sessionTimeStart = 0;

  return closeSegmentClient();
}

export function trackEvent<TEvent extends Event>(eventName: TEvent, payload?: EventMap[TEvent]) {
  const segmentClient = getSegmentClient();
  const eventPayload = { ...payload, sessionId: env.sessionId };

  if (!segmentClient) {
    return;
  }

  logger.log('Track event', env.machineId, eventName, eventPayload);

  segmentClient.track({
    event: eventName,
    properties: eventPayload,
    userId: env.machineId,
  });
}

export type EventStatus = 'started' | 'success' | 'failure' | 'cancelled';
export type BaseEvent = {status: EventStatus, error?: string};

export type Event = keyof EventMap;
export type EventMap = {
  'ext/installed': BaseEvent & {appVersion: string; deviceOS: NodeJS.Platform};
  'ext/session': BaseEvent & {appVersion: string, startTimeMs: number};
  'ext/session_end': BaseEvent & {endTimeMs: number, timeSpentSec: number};
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
  // Code actions tracking.
  'code_action/annotation_suppression': BaseEvent & {[key: string]: string | number | boolean};
};

function getAppVersion(): string {
  return extensions.getExtension('kubeshop.monokle')?.packageJSON?.version ?? 'unknown';
}

async function readMachineId(): Promise<string | null> {
  try {
    const filePath = normalize(join(globals.storagePath, `machine.id`));
    const machineId = await readFile(filePath);
    return machineId.toString().trim();
  } catch (e) {
    logger.error('Failed to read machine id', e);
    return null;
  }
}

async function saveMachineId(machineId: string) {
  try {
    await mkdir(globals.storagePath, { recursive: true });
    const filePath = normalize(join(globals.storagePath, `machine.id`));
    await writeFile(filePath, machineId);
  } catch (e) {
    logger.error('Failed to save machine id', e);
  }
}
