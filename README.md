<h2>Digital Solutions Notebook</h2>

<b>TL;DR</b>
This is a notebook extension that runs HTML, Javascript (including P5.js) and SQL.
Files need to have an extension *.dsnote to be recognised by the notebook.

Demo on Youtube
https://www.youtube.com/embed/cEEfh6m_9lg

<h3>HTML</h3>

Notebook can display almost any HTML, CSS and JS scripting in tags. Image files can be placed in the same folder as the notebook and referenced by name and they render. All html is referenced in the global scope of the notebook so changes can be made to the look of the entire workbook with CSS.

Limitations: Cannot play audio or video. This is a limitation of the VSCode environment. Also, images won't show up in created iframes unless remotely referenced by http(s).

<h3>Javascript</h3>
Javascript runs in the main scope of the notebook. So inputs in one cell can be used in another. It essentially wraps whatever is written into script tags and executed via eval. You can access and change elements refered to by name in HTML cells and dynamically change them.

Console logs are routed back to the notebook and show up in the output.

<h3>p5.js</h3>
p5.js cells create a document in an iframe and attach it to the cell output. Each instance is self contained and cannot be affected by other parts of the document.

If you enter code without the setup() and draw() functions it will render statically to the screen in a small window. The window should automatically resize to fit the canvas size created.

Probably try and avoid using windowWidth and windowHeight variables to set frame size to avoid disappointment.

<h3>SQL</h3>
SQL runs using <a href="https://sqljs.org">sql.js</a> under the hood. All standard SQL queries work.

Extra commands:
<ol>
<li>DUMP - prints out all data in all tables</li>
<li>CLEAR - clears the database from memory</li>
<li>LOAD <i>filename.db</i> - loads a file resident in the folder of the notebook</li>
<li>SAVE <i>filename.db</i> - saves the database to file in the folder of the notebook</li>
<li>DBDIAGRAM - generates a relational database schema from simple databases - inspired by the code for <a href="https://marketplace.visualstudio.com/items?itemName=dBizzy.dbizzy">dBizzy Extension</a>. No guarantee will work for complex databases.</li>
<li>DICTIONARY - generates a data dictionary for the database present. No guarantee it will work for complex databases.</li>
</ol>



<u>Limitations:</u>
<ul>
<li>Sound is not available in any form (a limitation of the VSCode environment), likewise for video playback.</li>
<li>p5js can only load images using the loadImage() function. All other load...() functions will not work in this edition. Probably fix this if VSCode ever supports audio playback.</li>
</ul>
