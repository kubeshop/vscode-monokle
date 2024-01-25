import { canRun } from '../utils/commands';
import { BaseEvent, Event, trackEvent } from '../utils/telemetry';
import type { RuntimeContext } from '../utils/runtime-context';

export type CustomEventData = BaseEvent & {
    [key: string]: string | number | boolean;
};

// This is internal command (not exposed via 'package.json') to track events from code actions.
export function getTrackCommand(_context: RuntimeContext) {
  return async (eventName: Event, eventData: CustomEventData) => {
    if (!canRun()) {
      return;
    }

    trackEvent(eventName, eventData);
  };
}
