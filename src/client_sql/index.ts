import { render } from './render';
import errorOverlay from 'vscode-notebook-error-overlay';
import type { ActivationFunction } from 'vscode-notebook-renderer';
import initSqlJs, { Database } from 'sql.js';


// Fix the public path so that any async import()'s work as expected.
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __webpack_relative_entrypoint_to_root__: string;
declare const scriptUrl: string;


__webpack_public_path__ = new URL(scriptUrl.replace(/[^/]+$/, '') + __webpack_relative_entrypoint_to_root__).toString();

// ----------------------------------------------------------------------------
// This is the entrypoint to the notebook renderer's webview client-side code.
// This contains some boilerplate that calls the `render()` function when new
// output is available. You probably don't need to change this code; put your
// rendering logic inside of the `render()` function.
// ----------------------------------------------------------------------------

///////////////////////////////////////
//// DATABASE LOADING /////////////////
///////////////////////////////////////

let config: Object = {
  locateFile: (file: any) => `https://sql.js.org/dist/${file}`
};


let db: Database;
// Create a database
initSqlJs(config).then(function (sql) {
  db = new sql.Database();
});


let foreignKeysOn = true;




export const activate: ActivationFunction = async (context) => {

  if (db === undefined) {
    const SQL = await initSqlJs(config);
    db = new SQL.Database();
   // console.log('Creating DB: foreign keys enabled.');
  } else {
   // console.log('exists');
  }


  return {

    async renderOutputItem(outputItem, element) {

      // QUERY TO GET ALL TABLES
      // SELECT tbl_name from sqlite_master WHERE type = "table"'

      let queryResults: any = [];
      let output;
      let error: any;
      let userQuery = outputItem.json().trim();
      let type = userQuery.split(" ")[0];

      let queries = userQuery.split(";");

      for (let i = 0; i < queries.length; i++) {

        let processed = false;

        let query = queries[i].trim().toUpperCase();
        let shadowquery = queries[i].trim();;

        if (query.length === 0) {
          const data = db.export();
          const buffer = data.buffer;
          continue;
        }


        /////////////////////////////////////
        ///// LOAD SQL FILE /////////////////
        ////////////////////////////////////
        if (query.startsWith('LOAD')) {

          shadowquery = shadowquery.substr(4).trim();
         // console.log(shadowquery);

          const dataPromise = await fetch(`${shadowquery}`);
          const res = await dataPromise.arrayBuffer();

          let sql = await initSqlJs(config);
          db.close();
          db = new sql.Database(new Uint8Array(res));

          error = "File Loaded";
          processed = true;
        }



        /////////////////////////////////////
        ///// SAVE SQL FILE /////////////////
        /////////////////////////////////////
        if (query.startsWith("SAVE")) {
          if (!context.postMessage) {
            error = "File cannot be saved.";
            processed = true;
            
          } else {

            shadowquery = shadowquery.substr(4).trim();
         //   console.log(shadowquery);

            let file = db.export();
            context.postMessage({
              request: 'savefile',
              data: file,
              filename: shadowquery
            });

            error = "File Saved.";
            processed = true;
          }
        };

        /////////////////////////////////////
        ///// CLEAR DATABASE /////////////////
        /////////////////////////////////////        
        if (query === "CLEAR") {
          db.close();
          let sql = await initSqlJs(config);
          db = new sql.Database();
          error = "Database cleared.";
          processed = true;
        }


        

        //////////////////////////////////////////////////////
        //// Foreign keys ////////////////////////////////////
        //////////////////////////////////////////////////////
        if (query.toUpperCase().replaceAll(" ","").startsWith("PRAGMAFOREIGN_KEYS=ON")) {
          foreignKeysOn = true;
          error = "Foreign keys are on.";
          processed = true;
        }
        if (query.toUpperCase().replaceAll(" ","").startsWith("PRAGMAFOREIGN_KEYS=OFF")) {
          error = "Foreign keys are off.";
          processed = true;
          foreignKeysOn = false;
        }


        //////////////////////////////////////////////////////
        ///// HANDLE ACTUAL DATABASE QUERIES  ////////////////
        //////////////////////////////////////////////////////
        if (!processed) {
          if (query === "DUMP") {
            let tableList: any = db.exec('SELECT tbl_name from sqlite_master WHERE type = "table" AND tbl_name<>"sqlite_sequence"');
            tableList = tableList[0].values;
          //  console.log(tableList);
            for (let i = 0; i < tableList.length; i++) {
              try {
                output = db.exec(`SELECT * FROM ${tableList[i][0]};`);
                error = "";
              } catch (e) {
                output = "";
                error = e;
              }
              let changes = db.getRowsModified();
              queryResults.push({ table: tableList[i][0], data: output, modified: changes, type: type, error: error });
            }
          } else {
            if (query.startsWith("INSERT") || query.startsWith("UPDATE") || query.startsWith('DELETE')) {
              if (query.endsWith(";")) {
                query = query.substr(0, query.length - 1);
              }
              query += " RETURNING *;";
            }

            if (query === "DBDIAGRAM") {
              query = "SELECT * FROM sqlite_schema;";
              type = "DBDIAGRAM";
            }

            if (query === "DICTIONARY") {
              query = "SELECT * FROM sqlite_schema;";
              type = "DICTIONARY";
            }


            try {
              output = db.exec(query);
              error = "";
            } catch (e) {
              output = "";
              error = e;
            }
            let changes = db.getRowsModified();
            queryResults.push({ table: '', data: output, modified: changes, type: type, error: error });
          }

        }
      }

      //need to run this after every query otherwise foreign keys turns off for some reason
      if (foreignKeysOn) {
        db.exec("PRAGMA foreign_keys=ON;");
      } else {
        db.exec("PRAGMA foreign_keys=OFF;");
      }
    

      let shadow = element.shadowRoot;
      if (!shadow) {
        shadow = element.attachShadow({ mode: 'open' });
        const root = document.createElement('div');
        root.id = 'root';
        shadow.append(root);
      }

      const root = shadow.querySelector<HTMLElement>('#root')!;
      errorOverlay.wrap(root, () => {
        root.innerHTML = '';
        let node = document.createElement('div');
        root.appendChild(node);
        //this is the render function in render.ts. You send the data and it sends back the formatted
        //webpage
        render({ container: node, mime: outputItem.mime, value: queryResults, context });
      });

    },
    disposeOutputItem(outputId) {
      // Do any teardown here. outputId is the cell output being deleted, or
      // undefined if we're clearing all outputs.


    }
  };
};



