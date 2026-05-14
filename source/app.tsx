import React, {useState, useEffect} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import {marked} from 'marked';
// @ts-ignore
import {markedTerminal} from 'marked-terminal';

marked.use(markedTerminal());

function useTerminalSize() {
	const [size, setSize] = useState({
		columns: process.stdout.columns || 80,
		rows: process.stdout.rows || 24
	});

	useEffect(() => {
		const onResize = () => {
			setSize({
				columns: process.stdout.columns,
				rows: process.stdout.rows
			});
		};
		process.stdout.on('resize', onResize);
		return () => {
			process.stdout.off('resize', onResize);
		};
	}, []);

	return size;
}

export default function App() {
	const {exit} = useApp();
	const size = useTerminalSize();
	const [text, setText] = useState('# Hello Markdown\n\nStart typing here...');

	useInput((input, key) => {
		if (key.escape) {
			exit();
			return;
		}

		if (key.return) {
			setText(prev => prev + '\n');
		} else if (key.backspace || key.delete) {
			setText(prev => prev.slice(0, -1));
		} else if (input) {
			setText(prev => prev + input);
		}
	});

	let renderedMarkdown = '';
	try {
		renderedMarkdown = marked(text) as string;
	} catch (err) {
		renderedMarkdown = 'Render Error';
	}

	return (
		<Box width={size.columns} height={size.rows} flexDirection="row">
			<Box 
				width="50%" 
				height="100%" 
				borderStyle="single" 
				borderColor="cyan" 
				paddingX={1} 
				flexDirection="column"
			>
				<Box borderBottom={false} marginBottom={1}>
					<Text color="cyan" bold>Editor (Press ESC to exit)</Text>
				</Box>
				<Box flexGrow={1}>
					<Text>{text}<Text inverse>█</Text></Text>
				</Box>
			</Box>
			<Box 
				width="50%" 
				height="100%" 
				borderStyle="single" 
				borderColor="green" 
				paddingX={1} 
				flexDirection="column"
			>
				<Box borderBottom={false} marginBottom={1}>
					<Text color="green" bold>Preview</Text>
				</Box>
				<Box flexGrow={1}>
					<Text>{renderedMarkdown}</Text>
				</Box>
			</Box>
		</Box>
	);
}
