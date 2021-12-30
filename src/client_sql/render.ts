
import type { RendererContext } from 'vscode-notebook-renderer';

interface IRenderInfo {
  container: HTMLElement;
  mime: string;
  value: any;
  context: RendererContext<unknown>;
}

//////////////////////////////////////////////////////////////
// This function is called to render your contents.
//////////////////////////////////////////////////////////////


let lastDiagram: HTMLIFrameElement;
export async function render({ container, mime, value, context }: IRenderInfo) {

  // console.log(value);

  for (let i = 0; i < value.length; i++) {

    let output = value[i];
    let type = output.type;
    let modified = output.modified;
    let table = output.table;
    let data = output.data;
    let error = output.error;

    if (error !== '') {
      //just log the error if if is there
      let p = document.createElement('div');
      p.innerHTML = error;
      container.appendChild(p);
      continue;
    }

    //print the summary data for the command run
    let p = document.createElement('p');
    p.setAttribute("style", "margin:0px;padding:0px;");
    if (type === "CREATE") {
      p.innerHTML = "Table created.";
      container.appendChild(p);
      continue;
    }

    //more detailed information for the insert, update and delete commands.
    let modifier = "";
    if (modified !== 1) {
      modifier = "s";
    }

    if (type === "INSERT") {
      p.innerHTML = JSON.parse(JSON.stringify(modified)) + " row" + modifier + " inserted.";
    }

    if (type === "UPDATE") {
      p.innerHTML = modified + " row" + modifier + " updated.";
    }

    if (type === "DELETE") {
      p.innerHTML = modified + " row" + modifier + " deleted.";
    }

    //if select, print out teh table
    if (type === "SELECT" || type === "DUMP") {
      p.innerHTML = table;
    }

    if (p.innerHTML !== "") { container.appendChild(p); }


    if (type === "DBDIAGRAM") {
      // console.log(output);
      if (data[0]===undefined) {
        p.innerHTML = "No tables to render."
        container.appendChild(p); 
        continue;
      }

      let columns = data[0].columns;
      let counter = 0;
      let found = false;
      columns.forEach((element: any) => {
        if (element !== "sql" && !found) {
          counter++;
        } else if (element === "sql") {
          found = true;
        }
      });

      let tableSQL = "";
      let values = data[0].values; //mulitple rows
      for (let j = 0; j < values.length; j++) {
        let row = values[j][counter];
        tableSQL += row + "; ";
      }
      let diagramContainer = document.createElement('iframe');
      lastDiagram = diagramContainer;
      diagramContainer.setAttribute("style", "min-height:500px; width:100%; border: 1px solid #cccccc; overflow:hidden; scrolling:none;");

      let tableData = parser(tableSQL);
      let renderInfo = schemaRenderer(tableData);

      let whitespace = new RegExp(/\s+/, 'g');
      let renderSQL = renderInfo.replaceAll(whitespace, " ");

      diagramContainer.srcdoc = getPreviewWebviewContent(renderSQL);
      container.appendChild(diagramContainer);
      continue;
    }

    if (type === "DICTIONARY") {
      // console.log(output);
      if (data[0]===undefined) {
        p.innerHTML = "No tables to render.";
        container.appendChild(p); 
        continue;
      }

      let columns = data[0].columns;
      let counter = 0;
      let found = false;
      columns.forEach((element: any) => {
        if (element !== "sql" && !found) {
          counter++;
        } else if (element === "sql") {
          found = true;
        }
      });

      let tableSQL = "";
      let values = data[0].values; //mulitple rows
      for (let j = 0; j < values.length; j++) {
        let row = values[j][counter];
        tableSQL += row + "; ";
      }
      let dictionaryContainer = document.createElement('div');
      dictionaryContainer.setAttribute("style","padding:5px");

      let tableData = parser(tableSQL);
      let renderInfo = dictionaryRenderer(tableData);
      dictionaryContainer.innerHTML = renderInfo;

      container.appendChild(dictionaryContainer);
      continue;
    }

    //now to print out the table data for the output
    if (data[0]===undefined) {
      p.innerHTML = table+'<br>No data.';
      container.appendChild(p);
      let ruler = document.createElement('br');
      container.appendChild(ruler);
  
      continue;
    }

    let columns = data[0].columns; //1 row
    let values = data[0].values; //mulitple rows

    let onScreenTable = document.createElement('table');
    onScreenTable.setAttribute('style', 'border: 1px solid black; border-collapse:collapse;margin:1px;');
    let outputTable = '';

    outputTable += "<tr>";
    columns.forEach((element: string) => {
      outputTable += '<th>' + element + '</th>';
    });
    outputTable += "</tr>";

    for (let j = 0; j < values.length; j++) {
      let row = values[j];
      outputTable += "<tr>";
      row.forEach((element: string) => {
        outputTable += '<td>' + element + '</td>';
      });
      outputTable += "</tr>";
    }

    outputTable = outputTable.replaceAll("<td>", '<td style="border: 1px solid black; min-width:70px; text-align:right; padding-right: 5px;">');
    outputTable = outputTable.replaceAll("<th>", '<th style="border: 1px solid black; min-width:70px; background-color: #cccccc;">');

    onScreenTable.innerHTML = outputTable;
    container.appendChild(onScreenTable);

    let ruler = document.createElement('br');
    container.appendChild(ruler);

  }



}

if (module.hot) {
  module.hot.addDisposeHandler(() => {
    // In development, this will be called before the renderer is reloaded. You
    // can use this to clean up or stash any state.
  });



}



/////////////////////////////////////////////////////////////////////
//// This renders the data dictionary ///////////////////////////////
/////////////////////////////////////////////////////////////////////

function dictionaryRenderer(data: any) {

  let render = ``;
  for (let i=0; i<data.length; i++){
    if (data[i].name===""){
      continue;
    }


    render += `<p style="margin-bottom:2px;"><b>Table: ${data[i].name}</b></p>`;
    if (data[i].data===undefined){
      render+= `No row in table.<br>`;
      continue;
    }

    render+=`<table style="border:1px solid black; border-collapse:collapse;>`;
    render+=`<tr style="background-color:#cccccc;">`;
    render+=`<th style="border:1px solid black;padding:5px;background-color:#cccccc;">Field Name</th>`;
    render+=`<th style="border:1px solid black;padding:5px;background-color:#cccccc;">Type</th>`;
    render+=`<th style="border:1px solid black;padding:5px;background-color:#cccccc;">Primary Key</th>`;
    render+=`<th style="border:1px solid black;padding:5px;background-color:#cccccc;">Foreign Key</th>`;
    render+=`<th style="border:1px solid black;padding:5px;background-color:#cccccc;">Not Null</th>`;
    render+=`<th style="border:1px solid black;padding:5px;background-color:#cccccc;">Unique</th>`;
    render+=`</tr>`;
    for (let j=0; j<data[i].data.length; j++){
      let field = data[i].data[j];
      let pk = field.pk ? "&check;" :"";
      let fk = field.pk ? "&check;" :"";
      let notnull = field.notnull ? "&check;" :"";
      let unique = field.unique ? "&check;" :"";
      render+=`<tr>`;
      render+=`<td style="border:1px solid black;padding:5px;">${field.name}</td>`;
      render+=`<td style="border:1px solid black;padding:5px;">${field.type}</td>`;
      render+=`<th style="color:green; border:1px solid black;padding:5px;">${pk}</th>`;
      render+=`<th style="color:green; border:1px solid black;padding:5px;">${fk}</th>`;
      render+=`<th style="color:green;border:1px solid black;padding:5px;">${notnull}</th>`;
      render+=`<th style="color:green; border:1px solid black;padding:5px;">${unique}</th>`;
      render+=`</tr>`;
    }
    render+=`</table><br>`;
  }


  return render;
}








////////////////////////////////////////////////////////////////////////////////////////
/// The renderer takes the parsed table data and turns it into code for the renderer ///
////////////////////////////////////////////////////////////////////////////////////////

function schemaRenderer(data: string | any[]) {

  let output = `
  digraph G { bgcolor = "none"graph [ rankdir = "LR" ];
  node [fontsize = 10 fontname = "opensans" shape=plain]`;

  let tableStrings = ``;
  let linkStrings = ``;
  for (let i = 0; i < data.length; i++) {
    let name = data[i].name.trim();
    let tables = data[i].data;
    if (name.trim().length === 0) {
      continue;
    }

    let construct = name + `[label=<
              <table title="${name}" border="0" cellborder="0" cellspacing="0" cellpadding="0" color="white" opacity="0.5" >
                  <tr>
                      <td ALIGN="LEFT" bgcolor="#cccccc" cellpadding="2">
                          <font color="black"><b>${name}</b></font>
                      </td>
                  </tr>
                  <hr/>
                  `;

    for (let j = 0; j < tables.length; j++) {
      let field = tables[j].name.trim();
      let type = tables[j].type.trim();
      let pk = tables[j].pk ? "green" : "#eeeeee";
      let fk = tables[j].fk.length ? "red" : "#eeeeee";

      construct += `
                  <tr>
                      <td port="${field}">
                          <table  border="0" cellborder="0" cellspacing="0"  cellpadding="3"  color="white" opacity="0.5" margin="0px" >
                              <tr>
                                  <td ALIGN="LEFT" bgcolor="#eeeeee"><FONT COLOR="${pk}">PK</FONT><FONT COLOR="${fk}">FK</FONT>&nbsp;|&nbsp;&nbsp;${field}</td>
                                  <td ALIGN="RIGHT" bgcolor="#eeeeee">${type}</td>
                              </tr>
                          </table>
                  </td>
              </tr>
                  `;


      if (tables[j].fk.length > 0) {
        //Persons:city_ID->Cities:city_ID[color = "#5ea54a"]
        for (let k = 0; k < tables[j].fk.length; k++) {
          let link = (tables[j].fk)[k];
          for (let l = 0; l < link.cols.length; l++) {
            var randomColor = "#000000".replace(/0/g,function(){return (~~(Math.random()*12)).toString(16);});
            linkStrings += `${name}:${field}->${link.table}:${(link.cols)[l]}[color = "${randomColor}"]`;
          }
        }
      }
    }

    construct += `
             </table>
          >];`;

    tableStrings += construct;

  }

  tableStrings += linkStrings;

  return output + tableStrings + `}`;

}





///////////////////////////////////////////////////////////////////
////// The parser turns the text into an array of objects /////////
////// that represent the tables and links ////////////////////////
///////////////////////////////////////////////////////////////////


function parser(sqlinput: string) {

  let tableData: {}[] = [];

  ///break up each statement in the original create table sql
  let sql = sqlinput.split(';');
  sql.forEach((element: string) => {

    let regex = new RegExp(/\s+/, 'g');
    let i = element.indexOf("(");
    let j = element.lastIndexOf(")");
    let start = element.substr(0, i).trim().replaceAll(regex, " ");


    let output = start.lastIndexOf(" ");
    start = start.substr(output).trim();
    let end = element.substr(i + 1, j - i - 1).trim();

    /////this breaks up the tables into an array
    //ignore the sqlite_sequence table
    if (start.indexOf('sqlite_sequence') === -1) {

      //this should be a function - it is repeared multipletimes
      //get the data between the brackets and split into statments for
      //each create line
      let lines = [];
      let buffer = "";
      let counter = 0;
      for (let i = 0; i < end.length; i++) {
        let char = end.substr(i, 1);
        if (char === "(") { counter++; }
        if (char === ")") { counter--; }
        if ((counter === 0 && char === ",") || (i === end.length - 1)) {
          if (i === end.length - 1) { buffer += char; }
          lines.push(buffer.replaceAll(regex, " ").trim());
          buffer = "";
        } else {
          buffer += char;
        }
      }

      //this sends each line in the table creation off for processing into an object
      let data:any = [];
      lines.forEach((line) => {
        let ll = columnMaker(line);
        if (ll !== "") {
          data.push(ll);
        }
      });
      lines.forEach((line) => {
        data = constraintMaker(line, data);
      });

      let newTable = {
        name : start,
        data : data
      };
      tableData.push(newTable);
    }

  });

  return tableData;

}


////////////////////////////////////////////////////////
//// This function makes the table constraints /////////
////////////////////////////////////////////////////////
function constraintMaker(line: string, data: string | any[]) {

  //only interested in primary and foreign keys
  let tableConstraints = [
    "PRIMARY KEY",
    "FOREIGN KEY"
  ]

  //determine if a string is a table constraint
  function isConstraint(constraints: string | any[], line: string) {
    for (let i = 0; i < constraints.length; i++) {
      if (line.startsWith(constraints[i])) {
        return true;
      }
    }
    return false;
  }


  if (isConstraint(tableConstraints, line)) {
    //dealing with a constraint - primary key first
    if (line.startsWith("PRIMARY KEY")) {
      //primary keys in brackets, are column names separated by commas;
      line = line.substr(11).trim();
      let counter = 0;
      let buffer = "";
      for (let i = 0; i < line.length; i++) {
        let char = line.substr(i, 1);
        if (char === "(") { counter++; }
        if (char === ")") { counter--; }
        if ((counter === 0 && char === " ") || (i === line.length)) {
          if (i === line.length - 1) { buffer += char; }
          i = line.length;
        } else {
          buffer += char;
        }
      }
      buffer = buffer.replaceAll(")", "").replaceAll("(", "")
      //buffer now contain columns separated by commas

      //obtain columns and clean them up
      let keys = buffer.split(",");
      for (let j = 0; j < keys.length; j++) {
        keys[j] = keys[j].trim();
      }

      //update the sent data to add in the primary key information
      for (let j = 0; j < data.length; j++) {
        for (let i = 0; i < keys.length; i++) {
          if (data[j].name === keys[i]) {
            data[j].pk = true;
          }
        }
      }

    }


    //now deal with foreign keys
    if (line.startsWith("FOREIGN KEY")) {
      //foreign key columns in brackets with comma separation
      line = line.substr(11).trim();
      let counter = 0;
      let buffer = "";
      for (let i = 0; i < line.length; i++) {
        let char = line.substr(i, 1);
        if (char === "(") { counter++; }
        if (char === ")") { counter--; }
        if ((counter === 0 && char === " ") || (i === line.length)) {
          if (i === line.length - 1) { buffer += char; }
          i = line.length;
        } else {
          buffer += char;
        }
      }

      line = line.substr(buffer.length).trim();
      buffer = buffer.replaceAll(")", "").replaceAll("(", "")
      //buffer now contains columns that are referenced as foreign keys

      //obtain columns and clean them up
      let keys = buffer.split(",");
      for (let j = 0; j < keys.length; j++) {
        keys[j] = keys[j].trim();
      }

      //now find dependencies
      //line now should start with references and be able to be processed the same as the other foreign keys
      //in normal line
      //copying and pasting code
      let fk = handleReferences(line);
      //update the sent data to add in the primary key information
      for (let j = 0; j < data.length; j++) {
        for (let i = 0; i < keys.length; i++) {
          if (data[j].name === keys[i]) {
            data[j].fk = (data[j].fk).concat(fk);
          }
        }
      }

    }
  }


  return data;
}



///////////////////////////////////////////////
/// This handles the creation of columns //////
///////////////////////////////////////////////
function columnMaker(line: string) {

  let data = {}

  let tableConstraints = [
    "CONSTRAINT",
    "PRIMARY KEY",
    "UNIQUE",
    "CHECK",
    "FOREIGN KEY"
  ]

  let columnConstraint = [
    "CONSTRAINT",
    "PRIMARY KEY",
    "NOT NULL",
    "UNIQUE",
    "CHECK",
    "DEFAULT",
    "COLLATE",
    "GENERATED",
    "REFERENCES"
  ]

  function isConstraint(constraints: string | any[], line: string) {
    for (let i = 0; i < constraints.length; i++) {
      if (line.startsWith(constraints[i])) {
        return true;
      }
    }
    return false;
  }


  //check for table constraints first
  if (isConstraint(tableConstraints, line)) {
    //dealing with a constraint 
    //ignore because will process later
    return "";
  } else {
   

    //get name of column - always first
    let name = line.substr(0, line.indexOf(" "));
  //  newColumn.name = name;
    line = line.substr(name.length).trim();

    //check is next is a constraint because types are optional
    //if it isn't a constraint, must be a type
    //types are text(,)
    let hasType = !isConstraint(columnConstraint, line);
    let type:string ="";
    if (hasType) {
      //scan foreward until find type
      //this is not the best way
      let counter = 0;
      let buffer = "";
      for (let i = 0; i < line.length; i++) {
        let char = line.substr(i, 1);
        if (char === "(") { counter++; }
        if (char === ")") { counter--; }
        if ((counter === 0 && char === " ") || (i === line.length)) {
          if (i === line.length - 1) { buffer += char; }
          i = line.length;
        } else {
          buffer += char;
        }
      }
      //send the type completely with brackets to the data
      //no need to split it up
      type = buffer;
      line = line.substr(buffer.length).trim();
    }

    let pk = false;
    let notnull = false;
    let unique = false;
    //find the easy constraints and log them
    if (line.includes("PRIMARY KEY")) { pk = true; };
    if (line.includes("NOT NULL")) { notnull = true; };
    if (line.includes("UNIQUE")) { unique = true; };


    //deal with the foreign key
    let fk = handleReferences(line);
    //may be multiple foreign keys

    let newColumn = {
      name:name,
      type:type,
      pk: pk,
      fk: fk,
      notnull: notnull,
      unique: unique
    };


    return newColumn;
  }

}


function handleReferences(line: string) {

  let keydata = [];
  while (line.includes("REFERENCES")) {
    line = line.substr(line.indexOf("REFERENCES") + 10).trim();
    //next word is table name, then columns in brackets
    let counter = 0;
    let buffer = "";
    for (let i = 0; i < line.length; i++) {
      let char = line.substr(i, 1);
      if (char === "(") { counter++; }
      if (char === ")") { counter--; }
      if ((counter === 0 && char === " ") || (i === line.length)) {
        if (i === line.length - 1) { buffer += char; }
        i = line.length;
      } else {
        buffer += char;
      }
    }

    //buffer now has text( , )
    let b = buffer.split("(");
    //first part is the table being referenced
    let table = b[0].trim();
    //now split the remaining fraction to get columns referenced in other table
    let cols = b[1].replace(")", "").trim().split(",");
    let cols2: string[] = [];
    //send these to an array
    cols.forEach((c) => {
      cols2.push(c);
    });
    let fk = {
      table:table,
      cols: cols2  
    };
   
    //push into the data to remember
    keydata.push(fk);
    //remove this reference and see if any more

    line = line.replace(buffer, "");
  }

  return keydata;

}








// starting index.html for previewing databases
const getPreviewWebviewContent = (sql: string) => {

  let data =
    `
  <!DOCTYPE html>
<html lang="en">

<head>

<script src="https://d3js.org/d3.v5.min.js"><\/script>
<script src="https://unpkg.com/@hpcc-js/wasm@0.3.11/dist/index.min.js"><\/script>
<script src="https://unpkg.com/d3-graphviz@3.0.5/build/d3-graphviz.js"><\/script>
<script
  src="https://cdn.rawgit.com/eligrey/canvas-toBlob.js/f1a01896135ab378aa5c0118eadd81da55e698d8/canvas-toBlob.js"><\/script>
<script
  src="https://cdn.rawgit.com/eligrey/FileSaver.js/e9d941381475b5df8b7d7691013401e171014e89/FileSaver.min.js"><\/script>

</head>

<body style="overflow:hidden; scrolling:none;">

<script>

document.addEventListener('DOMContentLoaded', () => {

  let sql= \`${sql}\` ;

//add the graph to the page
var body = document.querySelector('body');
var graph = document.createElement('div');
graph.setAttribute('id', 'graph');
body.appendChild(graph);

// Combine array to form a string for graphviz syntax
var diagraphString = sql;
var graphviz = d3.select('#graph').graphviz();

// Select #graph div and render the graph
function render() {
  graphviz
    .width(window.innerWidth)
    .height(window.innerHeight)
    .renderDot(diagraphString)
    .on("end", interactive);
}

// functions to handle mouseover to depict related tables only
function interactive() {
  const nodes = d3.selectAll('.node');
  const edges = d3.selectAll('.edge');
  const nodeList = nodes._groups[0];
  const edgeList = edges._groups[0];

  nodes
    .on("mouseenter", function () {
      const relatedTables = new Set();
      const title = d3.select(this).selectAll('title').text().trim();
      relatedTables.add(title);
      for (let i = 0; i < edgeList.length; i += 1) {
        const tableNames = edgeList[i].children[0].innerHTML.match(/([a-zA-Z_0-9])+(?=:)/g);
        if (tableNames.includes(title)) {
          tableNames.forEach(tableName => {
            relatedTables.add(tableName);
          });
        } else {
          edgeList[i].style.opacity = '10%';
        }
      }
      for (let i = 0; i < nodeList.length; i += 1) {
        if (!relatedTables.has(nodeList[i].children[0].innerHTML)) {
          nodeList[i].style.opacity = '10%';
        }
      }
    })
    .on("mouseleave", function () {
      const relatedTables = new Set();
      const title = d3.select(this).selectAll('title').text().trim();
      relatedTables.add(title);
      for (let i = 0; i < edgeList.length; i += 1) {
        const tableNames = edgeList[i].children[0].innerHTML.match(/([a-zA-Z_0-9])+(?=:)/g);
        if (tableNames.includes(title)) {
          tableNames.forEach(tableName => {
            relatedTables.add(tableName);
          });
        } else {
          edgeList[i].style.opacity = '100%';
        }
      }
      for (let i = 0; i < nodeList.length; i += 1) {
        if (!relatedTables.has(nodeList[i].children[0].innerHTML)) {
          nodeList[i].style.opacity = '100%';
        }
      }
    });
}

//now render




render(sql);
});




<\/script>
</body>

</html>
  `;



  return (data);
};






