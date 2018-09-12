import * as sourcegraph from 'sourcegraph'
import { memoizeAsync } from './util/memoizeAsync'

interface LSPResponse {
    result: any
}

interface LSPError {
    error: any
}

/** The context of an LSP request. */
interface LSPContext {
    /** The root URI (LSP `rootUri`)/ */
    root: string

    /** The mode identifier for the language server to communicate with. */
    mode: string
}

/** An LSP request. */
interface LSPRequest {
    /**
     * The LSP method for the request.
     *
     * @example "textDocument/hover"
     */
    method: string

    /** The parameters for the request. */
    params: any
}

/**
 * Sends an HTTP POST request with the given LSP request.
 */
export const sendLSPRequest = memoizeAsync(
    (arg: LSPContext & LSPRequest): Promise<LSPResponse[]> =>
        sourcegraph.commands
            .executeCommand<(LSPResponse | LSPError)[]>(
                'queryLSP',
                [
                    {
                        id: 0,
                        method: 'initialize',
                        params: {
                            rootUri: arg.root,
                            mode: arg.mode,
                            initializationOptions: { mode: arg.mode },
                        },
                    },
                    arg.method ? { id: 1, method: arg.method, params: arg.params } : null,
                    { id: 2, method: 'shutdown' },
                    { method: 'exit' },
                ].filter(m => m !== null)
            )
            .then(responses => {
                for (const response of responses) {
                    if (response && 'error' in response) {
                        throw Object.assign(new Error(response.error.message), response.error, { responses })
                    }
                }
                return responses.map(result => result && (result as LSPResponse))
            }),
    arg => JSON.stringify(arg) // not canonical, not perfect, but good enough
)
