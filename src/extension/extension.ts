import * as vscode from 'vscode';
import { Controller } from './kernal';
import { SampleSerializer } from './serializer';

let sql: any;

export function activate(context: vscode.ExtensionContext) {

	/////////////////////////////////////////////
	//// Load the notebook file /////////////////
	/////////////////////////////////////////////
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer('digitalsolutions-notebook', new SampleSerializer())
	);


	/////////////////////////////////////////////
	/// Load the kernal /////////////////////////
	/////////////////////////////////////////////
	context.subscriptions.push(new Controller());


	/////////////////////////////////////////////
	/// SQL MESSSAGE CONTROLLER  ////////////////
	/////////////////////////////////////////////

	const messageChannel = vscode.notebooks.createRendererMessaging('sql-ds-renderer');
	messageChannel.onDidReceiveMessage(e => {

		/////////////////////////////////////////////
		/// Save SQL Database sent from renderer ////
		/////////////////////////////////////////////

		if (e.message.request === 'savefile') {
			let data = e.message.data;
			let dataArray: any = [];
			Object.keys(data).forEach(key => {
				dataArray.push(data[key]);
			});

			let buffer = Uint8Array.from(dataArray);

			let path: string;
			if (!vscode.workspace.workspaceFolders) {
			} else {
				let root: vscode.WorkspaceFolder;
				if (vscode.workspace.workspaceFolders.length === 1) {
					root = vscode.workspace.workspaceFolders[0];
					path = root.uri.fsPath;
					let uri = vscode.Uri.file(path + "\\" + e.message.filename);
					vscode.workspace.fs.writeFile(uri, buffer);
				}
			}

		};


	});









};




