// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { downloadPug, getLatestVersion } from './download';
import { getPreludePath, getPugPath, readVersionFile } from './utilities';
let extensionContext: vscode.ExtensionContext;
let pugChannel: vscode.OutputChannel;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pug" is now active!');
	// Create a new channel for pug related logging
	pugChannel = vscode.window.createOutputChannel('Pug says');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// Create a command to load current file in the pug terminal
	let disposable2 = vscode.commands.registerCommand('pug.loadFile', () => {
		// Get the current file path
		loadCurrentFile();
	});

	let disposable3 = vscode.commands.registerCommand('pug.downloadBinary', async () => {
		await downloadPugCommand();
	});
	// Create command to Run pug-simple direct on terminal 
	let disposable1 = vscode.commands.registerCommand('pug.runSimple',()=>{
		runPugInTerminal("pug-simple");
	});
	// Create command to Run pug-standard direct on terminal
	let disposable4 = vscode.commands.registerCommand('pug.runStandard',() =>{
		runPugInTerminal("pug-standard");
	});


	const version = readVersionFile(context.extensionPath);
	pugChannel.appendLine(`Pug version: ${version}`);
	// If version is empty string, then download the latest version
	if (version === '') {
		pugChannel.appendLine('Pug version file not found. Downloading latest version.');
		downloadPugCommand();
	}
	context.subscriptions.push( disposable1, disposable2, disposable3, disposable4);
	extensionContext = context; //TODO: remove this global variable 
}

function loadCurrentFile() {
	const editor = vscode.window.activeTextEditor;
	// get the current programming language
	const pugLanguage = editor?.document.languageId;
	// TODO: on file load, change the editor language to pug-simple based on the prelude type congigured in the settings
	if (editor) {
		const document = editor.document;
		const filePath = document.fileName;
		// Find the terminal named pug
		var terminal = vscode.window.terminals.find(terminal => terminal.name === pugLanguage);
		// Create a new terminal and run gofer
		// const terminal = vscode.window.createTerminal('pug');
		if (!terminal) {
			terminal = createTerminal(pugLanguage, filePath);
		}
		else {
			terminal.sendText(`:l ${filePath}`);
		}
		terminal.show();
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}

function createTerminal(language: string, filePath: string = ""): vscode.Terminal {
	const terminal = vscode.window.createTerminal(language);
	const pugPath = getPugPath(extensionContext.extensionPath);
	// extract prelude type from the `language`
	const preludeType = language.split('-')[1];
	const preludePath = getPreludePath(extensionContext.extensionPath, preludeType);
	// create command for windows and linux
	const command = process.platform === 'win32' ? `$env:PUGOFER='${preludePath}'; ${pugPath}` :
	`export PUGOFER='${preludePath}'; ${pugPath}`;
	terminal.sendText(command + ` ${filePath}`);
	terminal.show();
	return terminal;
}

function runPugInTerminal(pugLanguage: string){
	//checking if terminal already open for prelude.
	var terminal = vscode.window.terminals.find(terminal => terminal.name === pugLanguage);
	// Create a new terminal if no terminal found.
	
	if (!terminal) {
		terminal = createTerminal(pugLanguage);
	}
	else {
		terminal.sendText(`:1`);
	}
	terminal.show(); 
}

async function downloadPugCommand() {
	const version = await getLatestVersion();
	await downloadPug(extensionContext.extensionPath, version);
	void vscode.window.showInformationMessage(`Downloaded pug version: ${version}`);
	pugChannel.appendLine(`Downloaded pug version: ${version}`);
}
