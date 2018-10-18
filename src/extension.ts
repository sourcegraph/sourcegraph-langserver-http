import * as sourcegraph from 'sourcegraph'
import { toHover } from './backcompat'
import { sendLSPRequest } from './lsp'

const subscriptions: sourcegraph.Unsubscribable[] = []
function disable(): void {
    for (const subscription of subscriptions) {
        subscription.unsubscribe()
    }
}

/** Entrypoint for the language server HTTP adapter Sourcegraph extension. */
export function activate(): void {
    subscriptions.push(
        sourcegraph.languages.registerHoverProvider(['*'], {
            provideHover: async (doc, pos) => {
                const result = await provideLSPResults('textDocument/hover', doc, pos)
                return toHover(result) // backcompat
            },
        })
    )
    subscriptions.push(
        sourcegraph.languages.registerDefinitionProvider(['*'], {
            provideDefinition: (doc, pos) => provideLSPResults('textDocument/definition', doc, pos),
        })
    )
    subscriptions.push(
        sourcegraph.languages.registerTypeDefinitionProvider(['*'], {
            provideTypeDefinition: (doc, pos) => provideLSPResults('textDocument/typeDefinition', doc, pos),
        })
    )
    subscriptions.push(
        sourcegraph.languages.registerImplementationProvider(['*'], {
            provideImplementation: (doc, pos) => provideLSPResults('textDocument/implementation', doc, pos),
        })
    )
    subscriptions.push(
        sourcegraph.languages.registerReferenceProvider(['*'], {
            provideReferences: (doc, pos) => provideLSPResults('textDocument/references', doc, pos),
        })
    )
}

async function provideLSPResults(
    method: string,
    doc: sourcegraph.TextDocument,
    pos: sourcegraph.Position
): Promise<any> {
    const root = doc.uri.replace(/#.*$/, '') // remove everything after the '#'
    try {
        const results = await sendLSPRequest({
            mode: doc.languageId,
            root,
            method,
            params: { textDocument: { uri: doc.uri }, position: { line: pos.line, character: pos.character } },
        })
        return results[1].result
    } catch (err) {
        console.error(
            'An error occurred when sending LSP requests to the language server, disabling this instance of the language extension (reload the page to clear this state). ',
            err
        )
        disable()
        return undefined
    }
}
