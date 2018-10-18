# sourcegraph-langserver-http

[![build](https://travis-ci.org/sourcegraph/sourcegraph-langserver-http.svg?branch=master)](https://travis-ci.org/sourcegraph/sourcegraph-langserver-http)
[![codecov](https://codecov.io/gh/sourcegraph/sourcegraph-langserver-http/branch/master/graph/badge.svg?token=c3KpMf1MaY)](https://codecov.io/gh/sourcegraph/sourcegraph-langserver-http)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

A [Sourcegraph extension](https://github.com/sourcegraph/sourcegraph-extension-api) that provides hovers, definitions, references, and implementations by communicating with an LSP-compliant language server over HTTP.

## Usage

> The below instructions will be effective soon. In the meantime, you also need to enable a feature flag to use this extension on Sourcegraph.com. Run the following in your browser's devtools JavaScript console: `localStorage.platform=true;location.reload()`.

This extension is enabled by default for all users on Sourcegraph.com. To use it, visit any file in a supported language on Sourcegraph.com (such as [config.go](https://sourcegraph.com/github.com/theupdateframework/notary@master/-/blob/cmd/notary-server/config.go)) and hover over tokens to see it in action.

## Development

Run `src extensions publish` (using the [`src` CLI](https://github.com/sourcegraph/src-cli)) to publish this extension for local development purposes. You will need to add `"publisher": "alice"` (replacing `alice` with your username) to `package.json`; see [src-cli #13](https://github.com/sourcegraph/src-cli/issues/13).

In development, it may be helpful to modify this extension's `package.json` file to contain `"activationEvents": ["onLanguage:foo"]` (where `foo` is some language ID). This causes it to only be activated for files of a specific language (not all files). The `"activationEvents": ["*"]` in the committed `package.json` will cause it to be used for all files, even files that are not code files.

## Release and publishing

This extension is different from other Sourcegraph extensions in that it is not published directly, for backcompat with language server site configuration in Sourcegraph. In the Sourcegraph backend, a `langserver/*` extension is synthesized for each element in the the [Sourcegraph `langservers` site config field](https://about.sourcegraph.com/docs/config/site/#langservers-array). This synthesized extension refers to the hard-coded JavaScript extension bundle URL `https://storage.googleapis.com/sourcegraph-cx-dev/sourcegraph-langserver-http.<VERSION>.js`. [Check the current version](https://sourcegraph.com/search?q=repo:%5Egithub%5C.com/sourcegraph/sourcegraph%24+sourcegraph-langserver-http).

To release a new version (which will immediately be used by all Sourcegraph instances), you need to bundle and upload that file. To do so, run:

```bash
npm install
npm run build

# Check the version in sourcegraph/sourcegraph in the search link above.
cp dist/extension.js dist/sourcegraph-langserver-http.<VERSION>.js

# Replace path/to/infrastructure with the path to your local checkout of the Sourcegraph internal
# infrastructure repository.
path/to/infrastructure/cmd/publish-sourcegraph-extension.bash dist/sourcegraph-langserver-http.<VERSION>.js

# This file is no longer needed.
rm dist/sourcegraph-langserver-http.3.js
```

To change the extension manifest for the synthesized `langserver/*` extensions, edit the `extensions_backcompat.go` file in `sourcegraph/sourcegraph`.
