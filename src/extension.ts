import {
    activateExtension,
    DefinitionRequest,
    DidOpenTextDocumentNotification,
    DidOpenTextDocumentParams,
    HoverRequest,
    ImplementationRequest,
    ReferencesRequest,
    Registration,
    RegistrationParams,
    RegistrationRequest,
    SourcegraphExtensionAPI,
    TextDocumentPositionParams,
    TypeDefinitionRequest,
} from '@sourcegraph/sourcegraph.proposed/module/extension'
import { createWebWorkerMessageTransports } from '@sourcegraph/sourcegraph.proposed/module/jsonrpc2/transports/webWorker'
import { sendLSPRequest } from './lsp'

interface Settings {
    ['languageServer.url']: string
}

let loggedNoURL = false

/** Entrypoint for the Codecov Sourcegraph extension. */
export async function run(sourcegraph: SourcegraphExtensionAPI<Settings>): Promise<void> {
    const root = sourcegraph.root
    if (!root) {
        return
    }

    // Track the language ID (== mode ID) of each opened file, so we know which language server mode ID to use when
    // forwarding requests for it.
    const uriToMode = new Map<string, string>()
    // HACK(sqs): This overrides the extension host's own handler for the same notification. Find a better way to do this.
    sourcegraph.rawConnection.onNotification(
        DidOpenTextDocumentNotification.type,
        (params: DidOpenTextDocumentParams) => {
            uriToMode.set(params.textDocument.uri, params.textDocument.languageId)
        }
    )

    // The LSP methods to forward.
    const methods: string[] = [
        HoverRequest.type.method,
        DefinitionRequest.type.method,
        ReferencesRequest.type.method,
        TypeDefinitionRequest.type.method,
        ImplementationRequest.type.method,
    ]
    const registrations: Registration[] = []
    for (const method of methods) {
        registrations.push({ id: method, method, registerOptions: { documentSelector: ['*'] } })

        // Respond to LSP requests for this method.
        sourcegraph.rawConnection.onRequest(method, async <P extends TextDocumentPositionParams>(params: P) => {
            const mode = uriToMode.get(params.textDocument.uri)
            if (!mode) {
                throw new Error(
                    `error forwarding ${method} request for ${params.textDocument.uri}: unknown language ID`
                )
            }

            const url =
                sourcegraph.configuration.get('languageServer.url') ||
                (sourcegraph.initializeParams.capabilities.experimental &&
                    sourcegraph.initializeParams.capabilities.experimental.sourcegraphLanguageServerURL) ||
                (/^https?:/.test(self.location.origin) ? `${self.location.origin}/.api/xlang` : undefined)
            if (!url) {
                if (!loggedNoURL) {
                    console.error(`Configure the "languageServer.url" setting to see ${method} results.`)
                    loggedNoURL = true
                }
                return null
            }

            const results = await sendLSPRequest({
                url,
                mode,
                root,
                method,
                params,
            })
            return results[1]
        })
    }

    // Tell the client that we provide these LSP features.
    await sourcegraph.rawConnection.sendRequest(RegistrationRequest.type, { registrations } as RegistrationParams)
}

// This runs in a Web Worker and communicates using postMessage with the page.
activateExtension<Settings>(createWebWorkerMessageTransports(self as DedicatedWorkerGlobalScope), run).catch(err =>
    console.error(err)
)
