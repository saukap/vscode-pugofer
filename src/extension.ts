import * as vscode from 'vscode';
import * as fs from 'fs';
import * as readline from 'readline';

import { downloadPug, getLatestVersion } from './download';
import { getPreludePath, getPugPath, readVersionFile } from './utilities';

let extensionContext: vscode.ExtensionContext;
let pugChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "pug" is now active!');
	pugChannel = vscode.window.createOutputChannel('Pug says');

	let disposable1 = vscode.commands.registerCommand('pug.runSimple', () => {
		runPugInTerminal("pug-simple");
	});
	let disposable2 = vscode.commands.registerCommand('pug.loadFile', () => {
		loadCurrentFile();
	});
	let disposable3 = vscode.commands.registerCommand('pug.downloadBinary', async () => {
		await downloadPugCommand();
	});
	let disposable4 = vscode.commands.registerCommand('pug.runStandard', () => {
		runPugInTerminal("pug-standard");
	});

	const version = readVersionFile(context.extensionPath);
	pugChannel.appendLine(`Pug version: ${version}`);
	if (version === '') {
		pugChannel.appendLine('Pug version file not found. Downloading latest version.');
		downloadPugCommand();
	}

	context.subscriptions.push(disposable1, disposable2, disposable3, disposable4);
	extensionContext = context;
}

function loadCurrentFile() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showWarningMessage('No active editor');
		return;
	}

	const document = editor.document;
	const filePath = document.fileName;
	const pugLanguage = document.languageId;

	let terminal = vscode.window.terminals.find(t => t.name === pugLanguage);

	if (document.isDirty) {
		vscode.window.showWarningMessage('Please save the file before loading it into PUGOFER.', 'Save and Load', 'Cancel')
			.then(async (choice) => {
				if (choice === 'Save and Load') {
					await document.save();
					handleFileLoad(terminal, pugLanguage, filePath);
				}
			});
	} else {
		handleFileLoad(terminal, pugLanguage, filePath);
	}
}

function handleFileLoad(
	terminal: vscode.Terminal | undefined,
	language: string,
	filePath: string
) {
	const logPath = '/tmp/pugofer_terminal.log';

	// If terminal doesn't exist, create and run fresh
	if (!terminal) {
		terminal = createTerminal(language, filePath);
		return;
	}

	// Otherwise, check if the last line starts with '?'
	fs.readFile(logPath, 'utf8', (err, data) => {
		if (err) {
			vscode.window.showErrorMessage(`Failed to read log file: ${logPath}`);
			return;
		}
		const lines = data.trim().split('\n');
		const lastLine = lines[lines.length - 1];
		if (lastLine.trim().startsWith('?')) {
			terminal.sendText(`:l ${filePath}`);
			terminal.show();
		} else {
			restartTerminal(language, filePath);
		}
	});
}

function restartTerminal(language: string, filePath: string) {
	const existing = vscode.window.terminals.find(t => t.name === language);
	if (existing) existing.dispose();
	setTimeout(() => {
		createTerminal(language, filePath);
	}, 300);
}

function createTerminal(language: string, filePath: string = ''): vscode.Terminal {
	const terminal = vscode.window.createTerminal({ name: language });
	const pugPath = getPugPath(extensionContext.extensionPath);
	const preludeType = language.split('-')[1];
	const preludePath = getPreludePath(extensionContext.extensionPath, preludeType);

	const logCommand = `script -q -f /tmp/pugofer_terminal.log`; // Start logging terminal output
	const pugCommand = `export PUGOFER='${preludePath}'; ${pugPath} ${filePath}`;

	terminal.sendText(`${logCommand}`); // Start script logging
	terminal.sendText(pugCommand);
	terminal.show();
	return terminal;
}

function runPugInTerminal(pugLanguage: string) {
	let terminal = vscode.window.terminals.find(terminal => terminal.name === pugLanguage);
	if (!terminal) {
		terminal = createTerminal(pugLanguage);
	} else {
		terminal.sendText(`:1`);
	}
	terminal.show();
}

async function downloadPugCommand() {
	const version = await getLatestVersion();
	await downloadPug(extensionContext.extensionPath, version);
	vscode.window.showInformationMessage(`Downloaded pug version: ${version}`);
	pugChannel.appendLine(`Downloaded pug version: ${version}`);
}

export function deactivate() {}
