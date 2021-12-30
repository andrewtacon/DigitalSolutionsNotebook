import * as vscode from 'vscode';

/////////////////////////////////////////////////////////////////
//// This is about executing cells //////////////////////////////
/////////////////////////////////////////////////////////////////


export class Controller {
	readonly controllerId = 'digitalsolutions-notebook-controller-id';
	readonly notebookType = 'digitalsolutions-notebook';
	readonly label = 'Digital Solutions Notebook';
	readonly supportedLanguages = ['p5js', 'javascript', 'html', 'sql'];
	readonly rendererScriptId = 'p5js-renderer-script';

	private readonly _controller: vscode.NotebookController;
	private _executionOrder = 0;

	private firstRun = true;
	private lastCell: any;

	constructor() {
		this._controller = vscode.notebooks.createNotebookController(
			this.controllerId,
			this.notebookType,
			this.label
		);

		this._controller.supportedLanguages = this.supportedLanguages;
		this._controller.supportsExecutionOrder = true;
		this._controller.executeHandler = this._execute.bind(this);


	}

	private _execute(
		cells: vscode.NotebookCell[],
		_notebook: vscode.NotebookDocument,
		_controller: vscode.NotebookController
	): void {
		for (let cell of cells) {
			this._doExecution(cell);
		}

	}

	private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
		const execution = this._controller.createNotebookCellExecution(cell);
		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now()); // Keep track of elapsed time to execute cell.

		let language = cell.document.languageId;
		let outputOptions = [];

		////////////////////////
		//// HTML rendering ////
		////////////////////////
		if (language === 'html') {
			outputOptions.push(vscode.NotebookCellOutputItem.text(cell.document.getText(), 'text/html'));
		}

		////////////////////////
		//// SQL rendering ////
		////////////////////////
		if (language === 'sql') {

			outputOptions.push(vscode.NotebookCellOutputItem.json(cell.document.getText(), 'x-application/sql-ds-renderer'));
		}


		///////////////////////////////////////////////////////////////////
		/// Javascript rendering using the browser to do it (not nodejs)///
		///////////////////////////////////////////////////////////////////

		if (language === 'javascript') {
			//the console log override works by
			//1. creating a target id - unique each time it runs
			this.lastCell = "target_" + Date.now();

			//2. creating an override of the deafult console log so it sends to the normal console
			//and appends to the DOM
			let _consoleLogIn_ = `	
				var consolelog = console.log;								//override original console
				console.log = function() {
					consolelog.apply(console,arguments);					//print to normal console first in case something goes wrong
					var p = document.createElement('div');					//create a dom element
					var args = Array.from(arguments);					
					p.innerHTML = args.join('&emsp;');	
					p.style.borderBottom = "1px solid #cccccc";
					document.getElementById('${this.lastCell}').appendChild(p);		//append the dom element
				};
				var consoleerror = console.error;								//override original console
				console.error = function() {
					consoleerror.apply(console,arguments);					//print to normal console first in case something goes wrong
					var p = document.createElement('div');					//create a dom element
					var args = Array.from(arguments);					
					p.innerHTML = args.join('&emsp;');	
					p.style.borderBottom = "1px solid #cccccc";
					p.style.backgroundColor = "#ffcdd2";
					document.getElementById('${this.lastCell}').appendChild(p);		//append the dom element
				};
				var consolewarn = console.warn;								//override original console
				console.warn = function() {
					consolewarn.apply(console,arguments);					//print to normal console first in case something goes wrong
					var p = document.createElement('div');					//create a dom element
					var args = Array.from(arguments);					
					p.innerHTML = args.join('&emsp;');	
					p.style.borderBottom = "1px solid #cccccc";
					p.style.backgroundColor = "#FFFACD";
					document.getElementById('${this.lastCell}').appendChild(p);		//append the dom element
				};
				
				`;

			//3. undoing the override so everything else works fine and can redo it again next time
			//the semi colon is required in case users do not add a closing semicolon to their script
			//on the last line
			let _consoleLogOut_ = `; console.log = consolelog; consolelog=undefined; console.warn = consolewarn; consolewarn=undefined; console.error = consoleerror; consoleerror=undefined;`;


			//4. joining all the content together
			//script tags are required around the user scripts
			let data = `
				<script>
					window.onerror = function(message, source, lineno, colno, error){
						if (message.startsWith("ResizeObserver")){
							return; //benign error - doesn't break anything - to do with slow rendering
									//because of this error catching
						}
						var p = document.createElement('div');					//create a dom element
						p.innerHTML = message;	
						p.style.borderBottom = "1px solid #cccccc";
						p.style.backgroundColor = "#ffcdd2";
						try {
							document.getElementById('${this.lastCell}').appendChild(p);
						} catch (e){}
					}
				</script>
				<script>` +
				_consoleLogIn_ +
				cell.document.getText() +
				_consoleLogOut_ +
				`</script>
				<div id='${this.lastCell}' style="display:flex;flex-direction:column"></div>
				`;

			//rendering as a webpage so can actually access the DOM
			outputOptions.push(vscode.NotebookCellOutputItem.text(data, 'text/html')); //use HTML as output not JS - this is so can access the dom easily for console logging in the override
			// application/javascipt just runs the same thing anyway as a straight eval()		
		}


		///////////////////////////////////////////////////
		//// This renders using the p5js renderer /////////
		///////////////////////////////////////////////////

		if (language === 'p5js') {
			//yes, this does have to be JSON, not TEXT like the others
			//it will break otherwise - don't make that mistake again


			outputOptions.push(vscode.NotebookCellOutputItem.json(cell.document.getText(), 'x-application/p5js-renderer'));
		}


		///this runs the actual render

		execution.replaceOutput([new vscode.NotebookCellOutput(outputOptions)]);
		execution.end(true, Date.now());
	}

	public dispose(): void { };




}



/* Do some execution here; not implemented */
/*
		execution.replaceOutput([
			new vscode.NotebookCellOutput([
	
				//this is simple text output
				//vscode.NotebookCellOutputItem.text('Dummy output text!')
	
				//error outputs
				try {
					// Some code 
				  } catch(error) {
					vscode.NotebookCellOutputItem.error(error);
				}
				
	
			])
		]);

					vscode.NotebookCellOutputItem.json({ hello: 'world' }),

*/




