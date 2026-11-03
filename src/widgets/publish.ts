import type { WidgetProjection } from '../core/widgets';

/** Browser/unsupported-platform implementation; native files are selected by Metro. */
export async function publishWidgets(_projection: WidgetProjection) {
  return { available: false };
}
