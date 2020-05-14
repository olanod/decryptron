import { decrypt } from "./decrypt.js";

const raf = requestAnimationFrame;
const html = (s) =>
  new DOMParser()
    .parseFromString(`<template>${s}</template>`, "text/html")
    .querySelector("template");

const template = html`
<style>
:host {
  --color-bright: #00FF41;
  --color-text: #008F11;
  --color-alt: #003B00;
  align-items: center;
  display: flex;
  font-family: monospace, sans;
  font-size: 10vmin;
  margin: auto;
} 
#msg { color: var(--color-alt); }
output { color: var(--color-bright); }
output.done { animation: done 1s; }
output.pulse { animation: pulse 600ms alternate infinite linear; }
button {
  background: none;
  border: 4px solid var(--color-bright);
  border-radius: 5vmin;
  color: var(--color-bright);
  font-size: 5vmin;
  height: 10vmin;
  margin-right: 5vmin;
  outline: none;
  width: 10vmin;
}
button:active { box-shadow: 0 0 0 3px var(--color-bright); }
@keyframes pulse {
  from { color: var(--color-alt); }
  to { color: var(--color-text); }
}
@keyframes done { 
  from { color: var(--color-text); }
  to { color: var(--color-bright); }
}
</style>

<button>🔓 </button>
<div>
  <div id="msg"><slot></slot></div>
  <output hidden></output>
</div>
`;

export class Decryptron13 extends HTMLElement {
  message = "";
  _decrypted = "";

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._shadow.append(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.message = this.textContent;
    this._shadow.querySelector("button")
      .addEventListener("click", this.decrypt.bind(this));
  }

  async decrypt() {
    let rafId;
    const $msg = this._shadow.querySelector("#msg").hidden = true;
    const $out = this._shadow.querySelector("output");
    $out.hidden = false;
    $out.classList.add("pulse");
    for await (let text of decrypt(this.message)) {
      this._decrypted = text;
      cancelAnimationFrame(rafId);
      rafId = raf(() => {
        $out.textContent = this._decrypted;
      });
    }
    $out.classList.remove("pulse");
    $out.classList.add("done");
  }
}
customElements.define("decryptron-13", Decryptron13);
