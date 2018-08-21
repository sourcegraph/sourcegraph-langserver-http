import { ajax, AjaxResponse } from 'rxjs/ajax'
import { catchError, map, tap } from 'rxjs/operators'

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
export async function sendLSPRequest(context: LSPContext, request?: LSPRequest): Promise<LSPResponse[]> {
    return ajax({
        method: 'POST',
        url: `${context.url}/${request ? request.method : 'initialize'}`,
        headers: {
            'X-Requested-With': 'cx-langserver-http',
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(
            [
                {
                    id: 0,
                    method: 'initialize',
                    params: {
                        rootUri: context.root,
                        mode: context.mode,
                        initializationOptions: { mode: context.mode },
                    },
                },
                request ? { id: 1, ...request } : null,
                { id: 2, method: 'shutdown' },
                { method: 'exit' },
            ].filter(m => m !== null)
        ),
    })
        .pipe(
            // Workaround for https://github.com/ReactiveX/rxjs/issues/3606
            tap(response => {
                if (response.status === 0) {
                    throw Object.assign(new Error('Ajax status 0'), response)
                }
            }),
            catchError<AjaxResponse, never>(err => {
                normalizeAjaxError(err)
                throw err
            }),
            map(({ response }) => response),
            map((responses: (LSPResponse | LSPError)[]) => {
                for (const response of responses) {
                    if (response && 'error' in response) {
                        throw Object.assign(new Error(response.error.message), response.error, { responses })
                    }
                }

                return responses.map(result => result && (result as LSPResponse).result)
            })
        )
        .toPromise()
}

function normalizeAjaxError(err: any): void {
    if (!err) {
        return
    }
    if (typeof err.status === 'number') {
        if (err.status === 0) {
            err.message = 'Unable to reach server. Check your network connection and try again in a moment.'
        } else {
            err.message = `Unexpected HTTP error: ${err.status}`
            if (err.xhr && err.xhr.statusText) {
                err.message += ` ${err.xhr.statusText}`
            }
        }
    }
}
