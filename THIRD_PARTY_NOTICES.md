# Third-party notices

The TypeScript/ESLint project configuration follows the official n8n nodes starter. Its notice is preserved below and applies to the starter material only. The separate LICENSE grants MIT for the intended connector release. This notice does not license the proprietary Compute backend, service, desktop application or trademarks.

Source: https://github.com/n8n-io/n8n-nodes-starter/blob/6240cb49c06c41b6bc0b2c4c6fc28924ad3a4fbd/LICENSE.md

Copyright 2022 n8n

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Development dependencies (including n8n and its official node CLI) retain their
own bundled notices and licenses in `node_modules`. They are not vendored or
included in the candidate package. The connector uses the `n8n-workflow` peer
provided by its host. No backend implementation is incorporated.

The connector was developed with AI assistance using the public REST contract and n8n interfaces. The public problem catalog is contract data, not an engine implementation. No backend, desktop or private Python source is included. Official node CLI 0.46.4 templates and installed host sources were inspected as interface/tooling references. The stock ESLint file is minimal API wiring; the prepared Actions workflows are project-specific and do not copy the CLI release script. The CLI/n8n implementations are development dependencies under their upstream terms, not relicensed or vendored here. Retained starter attribution is not evidence that all third-party tooling is MIT.
