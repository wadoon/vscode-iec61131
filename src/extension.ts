import * as vscode from 'vscode'; 

import * as path from 'path';
import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;

export default class IecLintingProvider implements vscode.CodeActionProvider {
	private static commandId: string = 'iec61131.lint';
	private command: vscode.Disposable | undefined;
	private diagnosticCollection: vscode.DiagnosticCollection | undefined;

	public activate(subscriptions: vscode.Disposable[]) {
		this.command = vscode.commands.registerCommand(IecLintingProvider.commandId, this.runCodeAction, this);
		subscriptions.push(this);
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection();

		vscode.workspace.onDidOpenTextDocument(this.doHlint, this, subscriptions);
		vscode.workspace.onDidCloseTextDocument((textDocument)=> {
			this.diagnosticCollection.delete(textDocument.uri);
		}, null, subscriptions);

		vscode.workspace.onDidSaveTextDocument(this.doHlint, this);

		// Hlint all open haskell documents
		vscode.workspace.textDocuments.forEach(this.doHlint, this);
	}

	public dispose(): void {
		this.diagnosticCollection.clear();
		this.diagnosticCollection.dispose();
		this.command.dispose();
	}

	private doHlint(textDocument: vscode.TextDocument) {
		if (textDocument.languageId !== 'iec61131') {
			return;
		}
		
		let decoded = ''
		let diagnostics: vscode.Diagnostic[] = [];

		let options = vscode.workspace.rootPath ? { cwd: vscode.workspace.rootPath } : undefined;
		let args =  ['--json', textDocument.fileName];
		
		let severity = vscode.DiagnosticSeverity.Information;
		let message = "Hello there";
		let range = new vscode.Range(0,0,1,0);
		let diagnostic = new vscode.Diagnostic(range, message, severity);
		diagnostics.push(diagnostic);
		this.diagnosticCollection.set(textDocument.uri, diagnostics);	


		/*let childProcess = cp.spawn('hlint', ['--json', textDocument.fileName], options);
		childProcess.on('error', (error: Error) => {
			console.log(error);
			vscode.window.showInformationMessage(`Cannot hlint the haskell file.`);
		});
		if (childProcess.pid) {
			childProcess.stdout.on('data', (data: Buffer) => {
				decoded += data;
			});
			childProcess.stdout.on('end', () => {
				JSON.parse(decoded).forEach( item => {
					let severity = item.severity.toLowerCase() === "warning" ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
					let message = item.hint + " Replace: " + item.from + " ==> " + item.to;
					let range = new vscode.Range(item.startLine - 1, item.startColumn - 1, item.endLine - 1, item.endColumn - 1);
					let diagnostic = new vscode.Diagnostic(range, message, severity);
					diagnostics.push(diagnostic);
				});
				this.diagnosticCollection.set(textDocument.uri, diagnostics);	
			});
		}*/
	}
	
	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.Command[] {
		let diagnostic:vscode.Diagnostic = context.diagnostics[0];
		return [{
			title: "Accept hlint suggestion",
			command: IecLintingProvider.commandId,
			arguments: [document, diagnostic.range, diagnostic.message]
		}];
	}
	
	private runCodeAction(document: vscode.TextDocument, range: vscode.Range, message:string): any {
		let fromRegex:RegExp = /.*Replace:(.*)==>.*/g
		let fromMatch:RegExpExecArray = fromRegex.exec(message.replace(/\s/g, ''));
		let from = fromMatch[1];
		let to:string = document.getText(range).replace(/\s/g, '')
		if (from === to) {
			let newText = (/.*==>\s(.*)/g).exec(message)[1]
			let edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, range, newText);
			return vscode.workspace.applyEdit(edit);
		} else {
			vscode.window.showErrorMessage("The suggestion was not applied because it is out of date. You might have tried to apply the same edit twice.");
		}
	}
}


export function activate(context: vscode.ExtensionContext) {
	let linter = new IecLintingProvider();	
	linter.activate(context.subscriptions);
	vscode.languages.registerCodeActionsProvider('iec61131', linter);
}


console.log("test");