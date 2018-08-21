import {
    activateExtension,
    CXP,
    DefinitionRequest,
    DidOpenTextDocumentNotification,
    DidOpenTextDocumentParams,
    HoverRequest,
    ImplementationRequest,
    ReferencesRequest,
    Registration,
    RegistrationParams,
    RegistrationRequest,
    TextDocumentPositionParams,
    TypeDefinitionRequest,
} from 'cxp/module/extension'
import { createWebWorkerMessageTransports } from 'cxp/module/jsonrpc2/transports/webWorker'
import { sendLSPRequest } from './lsp'

interface Settings {
    ['languageServer.url']: string
}

let loggedNoURL = false

/** Entrypoint for the Codecov CXP extension. */
export async function run(cxp: CXP<Settings>): Promise<void> {
    const root = cxp.root
    if (!root) {
        return
    }

    // Track the language ID (== mode ID) of each opened file, so we know which language server mode ID to use when
    // forwarding requests for it.
    const uriToMode = new Map<string, string>()
    // HACK(sqs): This overrides the extension host's own handler for the same notification. Find a better way to do this.
    cxp.rawConnection.onNotification(DidOpenTextDocumentNotification.type, (params: DidOpenTextDocumentParams) => {
        uriToMode.set(params.textDocument.uri, params.textDocument.languageId)
    })

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
        cxp.rawConnection.onRequest(method, async <P extends TextDocumentPositionParams>(params: P) => {
            const mode = uriToMode.get(params.textDocument.uri)
            if (!mode) {
                console.log(Array.from(uriToMode.entries()))
                throw new Error(
                    `error forwarding ${method} request for ${params.textDocument.uri}: unknown language ID`
                )
            }

            // HACK(sqs): Determining the HTTP endpoint URL from the origin only works in the Sourcegraph web app,
            // not in the browser extension. Add a new client capability that exposes the Sourcegraph URL, or
            // something similar.
            const url =
                cxp.configuration.get('languageServer.url') ||
                (/^https?:/.test(self.location.origin) ? `${self.location.origin}/.api/xlang` : undefined)
            if (!url) {
                if (!loggedNoURL) {
                    console.error(`Configure the "languageServer.url" setting to see ${method} results.`)
                    loggedNoURL = true
                }
                return null
            }

            const results = await sendLSPRequest(
                {
                    url,
                    mode,
                    root,
                },
                { method, params }
            )
            return results[1]
        })
    }

    // Tell the client that we provide these LSP features.
    await cxp.rawConnection.sendRequest(RegistrationRequest.type, { registrations } as RegistrationParams)
}

// This runs in a Web Worker and communicates using postMessage with the page.
activateExtension<Settings>(createWebWorkerMessageTransports(self as DedicatedWorkerGlobalScope), run).catch(err =>
    console.error(err)
)
