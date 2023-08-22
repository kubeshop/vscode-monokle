import {Analytics} from '@segment/analytics-node';
import {env} from 'vscode';
import {SEGMENT_API_KEY} from '../config';
import logger from './logger';
import globals from './globals';

let client: Analytics | undefined;

export function getSegmentClient() {
  if (!env.isTelemetryEnabled || !globals.telemetryEnabled ) {
    return undefined;
  }

  if (!client) {
    if (SEGMENT_API_KEY) {
      logger.log('Enabled Segment');
      client = new Analytics({writeKey: SEGMENT_API_KEY});
    }
  }

  return client;
}

export async function closeSegmentClient() {
  if (client) {
    logger.log('Close Segment client');
    await client.closeAndFlush();
    client = undefined;
  }
}
