import type { RendererContext } from 'vscode-notebook-renderer';

/////////////////////////////

interface IRenderInfo {
  container: HTMLElement;
  mime: string;
  value: any;
  context: RendererContext<unknown>;
}

//////////////////////////////////////////////////////////////
// This function is called to render your contents.
//////////////////////////////////////////////////////////////

export async function render({ container, mime, value, context }: IRenderInfo) {


  

  //this creates the iframe where the p5js sketch will live
  //it needs an iframe because otherwise you have to do things in instance mode which is harder
  //it needs to be invisible at the start otherwise it won't size correctly when it shows up
  const pre = document.createElement('iframe');
  pre.id = "iframeTest";
  pre.style.padding = "0px";
  pre.style.margin = "0px";
  pre.style.visibility = "hidden";
  pre.style.border = "1px solid #cccccc";
  pre.setAttribute("scrolling", "no");

  //this function is necessary. It sends a message to the main document that the frame has loaded.
  //This will make the iFrame appear in the code execution box by changing the visibility
  //of the iFrame. It's a bit hacky but it works.

  pre.onload = function () {
    pre.style.visibility = 'visible';
    pre.style.height = pre.contentWindow!.document.scrollingElement?.scrollHeight + "px";
    pre.style.width = pre.contentWindow!.document.scrollingElement?.scrollWidth + "px";
  };




  //find all files needing loading and preload as base 64 (for images) - most other loads are clean

  ////////////////////////////////////////////
  ///// Preload Images ///////////////////////
  ////////////////////////////////////////////

  function blobToBase64(blob: any) {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  const loadImages = new RegExp(/loadImage\(\s?.+\s?\)/, 'g');
  let images = [...value.matchAll(loadImages)];
  // console.log(images);
  for (let i = 0; i < images.length; i++) {
    images[i][0] = images[i][0].replace("loadImage(", "").replace(")", "").replaceAll("'", "").replaceAll('"', '');
  }
  let _items: any = {};
  for (let i = 0; i < images.length; i++) {
    let url = images[i][0];
    let response = await fetch(url);
    let blob = await response.blob();
    let base64 = await blobToBase64(blob);
    value = value.replace(images[i][0], base64);
  }

  //////////////////////////////////////////////////////////
  //// Preload sounds //////////////////////////////////////
  //////////////////////////////////////////////////////////
/*
  const loadSounds = new RegExp(/loadSound\(\s?.+\s?\)/, 'g');
  let sounds = [...value.matchAll(loadSounds)];
  // console.log(images);
  for (let i = 0; i < sounds.length; i++) {
    sounds[i][0] = sounds[i][0].replace("loadSound(", "").replace(")", "").replaceAll("'", "").replaceAll('"', '');
  }
  let _sounds: any = {};
  for (let i = 0; i < sounds.length; i++) {
    let url = sounds[i][0];
    let response = await fetch(url);
    let blob = await response.blob();
    let file = new File([blob], sounds[i][0]);
    value = value.replace(sounds[i][0], file);
  }
*/



  //move contents of preload into the start of the setup function
  //items already loaded earlier by code above
  const preloadFunction = new RegExp(/function\s+preload\s*\(\)\s*{/, 'g');
  let match = value.match(preloadFunction);
  //if there is a preload function, then move contents and kill it
  if (match !== null) {
    let index = value.indexOf(match[0]) + match[0].length;
    let rest = value.slice(index);
    let end = rest.indexOf("}");
    let contents = rest.substr(0, end);

    const setupFunction = new RegExp(/function\s+setup\s*\(\)\s*{/, 'g');
    match = value.match(setupFunction);
    index = value.indexOf(match[0]) + match[0].length;
    value = value.slice(0, index) + contents + ";" + value.slice(index);

    //kill preload function
    value = value.replace(/function\s+preload/, "function _dontrun_preload");
  }


  //this creates a unique div id so the messages from the iframe can 'console' logged to the notebook in the
  //right placce
  let identifer = "target_" + Date.now();

  let code = '';

  //this checks the sent code and alters it according to the what is potentially missing
  //case 1: no setup and no draw function
  if (value.search(/function\s+setup/) === -1 && value.search(/function\s+draw/) === -1) {
    code = `
      function setup() {
        createCanvas(100,100);
      }

      function draw(){
        background(220);
        ${value};
        noLoop();
      }
    `;
    // console.warn("Setup function missing. Draw function missing.");
  } else if (value.search(/function\s+setup/) === -1 && value.search(/function\s+draw/) !== -1) {
    code = `
      function setup() {
        createCanvas(100,100);
      }
      
      ${value};  
    `;
    // console.warn("Setup function missing.");

  } else {
    code = value;
  }

  //this is the basic html page the sketch is contained within
  let content = `
    <html>
      <head>
 
        <style>
          * {
            margin: 0px;
            padding: 0px;
          }
        </style>

        <script>
     
          
          

          //need to override the console.log functions so they send the message to the
          //parent (the output cell in the notebook) so it can be added to the console output div there
          var _log = console.log;
          var _error = console.error;
          var _warning = console.warn;
        
          console.error = function(errMessage){
            sendLog(Array.from(arguments), "error");              
            _error.apply(console,arguments);
          };
        
          console.log = function(){
              sendLog(Array.from(arguments), "log");              
              _log.apply(console,arguments);
          };
        
          console.warn = function(warnMessage){
            sendLog(Array.from(arguments), "warn");              
            _warning.apply(console,arguments);
          };

          function sendLog(message, type){
            let output = {}
            output.type = type;
            output.message = message;
            output.target = "${identifer}";

            window.parent.postMessage(JSON.stringify(output), '*');
          }

        </script>

        <script>
          //need this to catch syntax errors - apparently it needs its own script tages to work
          window.onerror = function(message, source, lineno, colno, error){
            if (message.startsWith("ResizeObserver")){
              return; //benign error - doesn't break anything - to do with slow rendering
                  //because of this error catching
            }
            sendLog(message, "error");
          }
        </script>

        <!--this uses a cdn to pull in the p5JS library - it needs to change to use a local copy-->
        <script src="https://cdn.jsdelivr.net/npm/p5@1.4.0/lib/p5.js"></script>
        <!--script src="https://cdn.jsdelivr.net/npm/p5@0.9.0/lib/addons/p5.sound.js"></script-->

      </head>
      <body>
        <main>
        </main>
        <script>
          ${code}
        </script>
      </body>
   
    </html>
  `;

  //append the content to the iframe
  pre.srcdoc = content;
  container.appendChild(pre);

  //this sets up the div that shows the console log messages
  const log = document.createElement('div');
  log.id = identifer;
  log.style.display = "flex";
  log.style.flexDirection = "column";
  container.appendChild(log);

  //this is the listener that picks up the console and error messages sent from the iframe
  //and logs them in the correct location on the screen
  window.addEventListener('message', (event) => {
    let output = event.data;
    try {
      output = JSON.parse(event.data);
    } catch (e) { }

    var p = document.createElement('div');					//create a dom element
    p.innerHTML = output.message;
    p.style.borderBottom = "1px solid #cccccc";

    if (output.type === "log") {
      if (output.target === identifer) {
        log.appendChild(p);

      }
    }
    if (output.type === "warn") {
      if (output.target === identifer) {
        p.style.backgroundColor = "#fffacd";
        log.appendChild(p);
      }
    }
    if (output.type === "error") {
      if (output.target === identifer) {
        p.style.backgroundColor = "#ffcdd2";
        log.appendChild(p);
      }
    }
  });


}

if (module.hot) {
  module.hot.addDisposeHandler(() => {
    // In development, this will be called before the renderer is reloaded. You
    // can use this to clean up or stash any state.
  });



}


