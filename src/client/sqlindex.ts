import { render } from './render';
import errorOverlay from 'vscode-notebook-error-overlay';
import type { ActivationFunction } from 'vscode-notebook-renderer';
//this doesn't work
//import * as styleSheet from "./style.css";

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


export const activate: ActivationFunction = (context) => {
  return {
    renderOutputItem(outputItem, element) {
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
        render({ container: node, mime: outputItem.mime, value: outputItem.json(), context });
      });

    },
    disposeOutputItem(outputId) {
      // Do any teardown here. outputId is the cell output being deleted, or
      // undefined if we're clearing all outputs.
    }
  };
};
