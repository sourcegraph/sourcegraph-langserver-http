# cx-langserver-http (WIP)

[![npm](https://img.shields.io/npm/v/cx-langserver-http.svg)](https://www.npmjs.com/package/cx-langserver-http)
[![downloads](https://img.shields.io/npm/dt/cx-langserver-http.svg)](https://www.npmjs.com/package/cx-langserver-http)
[![build](https://travis-ci.org/sourcegraph/cx-langserver-http.svg?branch=master)](https://travis-ci.org/sourcegraph/cx-langserver-http)
[![codecov](https://codecov.io/gh/sourcegraph/cx-langserver-http/branch/master/graph/badge.svg?token=c3KpMf1MaY)](https://codecov.io/gh/sourcegraph/cx-langserver-http)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A [CXP](https://github.com/sourcegraph/cxp-js) extension that provides hovers, definitions, references, and implementations by communicating with an LSP-compliant language server over HTTP.

## Usage

> The below instructions will be effective soon. In the meantime, you also need to enable a feature flag to use this extension on Sourcegraph.com. Run the following in your browser's devtools JavaScript console: `localStorage.platform=true;location.reload()`.

This extension is enabled by default for all users on Sourcegraph.com. To use it, visit any file in a supported language on Sourcegraph.com (such as [config.go](https://sourcegraph.com/github.com/theupdateframework/notary@master/-/blob/cmd/notary-server/config.go)) and hover over tokens to see it in action.

## Development

This extension is different from other Sourcegraph extensions in that it is (typically) not published directly. Instead, its bundled JavaScript file is used by every `langserver/*` extension (which, in turn, are synthesized on-the-fly from the [Sourcegraph `langservers` site config option](https://about.sourcegraph.com/docs/config/site/#langservers-array)). Use the `cx-publish.bash` script in the internal Sourcegraph repository to publish a new version.

If you publish this as its own extension (e.g., for local dev), use `"activationEvents": ["onLanguage:foo"]` (where `foo` is some language ID) to ensure it's only activated for files of a specific language and not all files.
