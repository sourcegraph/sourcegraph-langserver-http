import * as sourcegraph from 'sourcegraph'
import { toHover } from './backcompat'
import { sendLSPRequest } from './lsp'

/** Entrypoint for the language server HTTP adapter Sourcegraph extension. */
export function activate(): void {
    sourcegraph.languages.registerHoverProvider(['*'], {
        provideHover: async (doc, pos) => {
            const result = await provideLSPResults('textDocument/hover', doc, pos)
            return toHover(result) // backcompat
        },
    })
    sourcegraph.languages.registerDefinitionProvider(['*'], {
        provideDefinition: (doc, pos) => provideLSPResults('textDocument/definition', doc, pos),
    })
    sourcegraph.languages.registerTypeDefinitionProvider(['*'], {
        provideTypeDefinition: (doc, pos) => provideLSPResults('textDocument/typeDefinition', doc, pos),
    })
    sourcegraph.languages.registerImplementationProvider(['*'], {
        provideImplementation: (doc, pos) => provideLSPResults('textDocument/implementation', doc, pos),
    })
    sourcegraph.languages.registerReferenceProvider(['*'], {
        provideReferences: (doc, pos) => provideLSPResults('textDocument/references', doc, pos),
    })
}

async function provideLSPResults(
    method: string,
    doc: sourcegraph.TextDocument,
    pos: sourcegraph.Position
): Promise<any> {
    const root = doc.uri.replace(/#.*$/, '') // remove everything after the '#'
    const results = await sendLSPRequest({
        mode: doc.languageId,
        root,
        method,
        params: { textDocument: { uri: doc.uri }, position: { line: pos.line, character: pos.character } },
    })
    return results[1].result
}
