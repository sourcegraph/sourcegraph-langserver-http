import { memoizeAsync } from './util/memoizeAsync'

interface LSPResponse {
    result: any
}

interface LSPError {
    error: any
}

/** The context of an LSP request. */
interface LSPContext {
    /** The URL of the HTTP endpoint. */
    url: string

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
        fetch(`${arg.url}/${arg.method || 'initialize'}`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'cx-langserver-http',
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            mode: 'cors',
            body: JSON.stringify(
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
            ),
        })
            .then(resp => {
                if (resp.status !== 200) {
                    if (resp.status === 0) {
                        return Promise.reject(
                            new Error(
                                'Unable to reach server. Check your network connection and try again in a moment.'
                            )
                        )
                    }
                    return resp
                        .text()
                        .then(text => Promise.reject(new Error(`Unexpected HTTP error: ${resp.status} ${text}`)))
                }
                return Promise.resolve(resp)
            })
            .then(resp => resp.json())
            .then((responses: (LSPResponse | LSPError)[]) => {
                for (const response of responses) {
                    if (response && 'error' in response) {
                        throw Object.assign(new Error(response.error.message), response.error, { responses })
                    }
                }
                return responses.map(result => result && (result as LSPResponse).result)
            }),
    arg => JSON.stringify(arg) // not canonical, not perfect, but good enough
)
