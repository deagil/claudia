import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://fec5fe5250fa9bf17e5a2c8b06d5d2a7@o4507171076374528.ingest.de.sentry.io/4507171078013008',

	tracesSampleRate: 1.0,

	// Enable logs to be sent to Sentry
	enableLogs: true,

	// This sets the sample rate to be 10%. You may want this to be 100% while
	// in development and sample at a lower rate in production
	replaysSessionSampleRate: 0.1,

	// If the entire session is not sampled, use the below sample rate to sample
	// sessions when an error occurs.
	replaysOnErrorSampleRate: 1.0,

	// If you don't want to use Session Replay, just remove the line below:
	integrations: [replayIntegration()]
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
