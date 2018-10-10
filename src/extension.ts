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

    sourcegraph.workspace.onDidOpenTextDocument.subscribe(doc => {
        const icon = (color: string) =>
            'data:image/svg+xml;base64,' +
            btoa(
                `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
                   <svg class="mdi-icon icon-inline" width="24" height="24" fill="${color}" viewBox="0 0 24 24">
                     <path d="M16,7V3H14V7H10V3H8V7H8C7,7 6,8 6,9V14.5L9.5,18V21H14.5V18L18,14.5V9C18,8 17,7 16,7Z"></path>
                   </svg>
                 </svg>
                `
            )
        sourcegraph.internal.updateContext({ 'langserver.statusIconURL': icon('#37b24d') })
        sourcegraph.internal.updateContext({
            'langserver.statusDescription': `Connected to the ${doc.languageId} language server`,
        })
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
