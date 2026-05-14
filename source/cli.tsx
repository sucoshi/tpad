#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

meow(
	`
	Usage
	  $ tpad

	Examples
	  $ tpad
`,
	{
		importMeta: import.meta,
	},
);

// Enter alternate screen buffer
process.stdout.write('\x1b[?1049h');

// Ensure we leave the alternate screen buffer when the process exits
process.on('exit', () => {
	process.stdout.write('\x1b[?1049l');
});
process.on('SIGINT', () => {
	process.stdout.write('\x1b[?1049l');
	process.exit(0);
});

const { waitUntilExit } = render(<App />);

await waitUntilExit();
