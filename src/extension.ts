import * as sourcegraph from 'sourcegraph'
import { toHover } from './backcompat'
import { sendLSPRequest } from './lsp'

/** Entrypoint for the language server HTTP adapter Sourcegraph extension. */
export function activate(): void {
    activateWith({ provideLSPResults })
}

export function activateWith({
    provideLSPResults,
}: {
    provideLSPResults: (
        method: string,
        doc: sourcegraph.TextDocument,
        pos: sourcegraph.Position,
        initializationOptions?: any
    ) => Promise<any>
}): void {
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

export async function provideLSPResults(
    method: string,
    doc: sourcegraph.TextDocument,
    pos: sourcegraph.Position,
    initializationOptions?: any
): Promise<any> {
    const root = doc.uri.replace(/#.*$/, '') // remove everything after the '#'
    try {
        const results = await sendLSPRequest({
            mode: doc.languageId,
            root,
            method,
            params: { textDocument: { uri: doc.uri }, position: { line: pos.line, character: pos.character } },
            initializationOptions: { ...(initializationOptions || {}), mode: doc.languageId },
        })
        return results[1].result
    } catch (err) {
        console.error('Code intelligence request', method, 'failed:', err)
        return undefined
    }
}
