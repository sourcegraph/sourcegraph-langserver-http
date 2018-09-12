import { Hover, MarkupContent, MarkupKind, Range } from 'sourcegraph'
import { Hover as VSCodeHover } from 'vscode-languageserver-types'

// Codeintellify doesn't yet support the new, non-deprecated MarkupContent for Hover contents. The problem is that
// when it syntax-highlights the Markdown, it sanitizes the syntax-highlighting colors away, so the code is
// monochromatic.
//
// TODO: fix that
const USE_BACKCOMPAT = true

export function toHover(hover: Hover | (VSCodeHover & { contents: string[] }) | null): Hover | null {
    if (!USE_BACKCOMPAT) {
        return toHoverNoBackcompat(hover)
    }
    if (!hover) {
        return null
    }
    return {
        contents: { value: '' },
        __backcompatContents: hover.contents as Hover['__backcompatContents'],
        range: hover.range
            ? new Range(
                  hover.range.start.line,
                  hover.range.start.character,
                  hover.range.end.line,
                  hover.range.end.character
              )
            : undefined,
    }
}

function toHoverNoBackcompat(hover: Hover | (VSCodeHover & { contents: string[] }) | null): Hover | null {
    const contents: string[] = []
    let range: Hover['range']
    if (hover) {
        if (Array.isArray(hover.contents)) {
            contents.push(...hover.contents.map(toMarkupContentValue))
        } else {
            contents.push(toMarkupContentValue(hover.contents))
        }
        if (hover.range && !range) {
            range = new Range(
                hover.range.start.line,
                hover.range.start.character,
                hover.range.end.line,
                hover.range.end.character
            )
        }
    }
    const mergedContents: MarkupContent = { value: contents.join('\n\n'), kind: 'markdown' as MarkupKind }
    mergedContents.value.trim()
    const result: Hover = { contents: mergedContents }
    if (!result.contents.value) {
        return null
    }
    if (range) {
        result.range = range
    }
    return result
}

function toMarkupContentValue(
    content: string | { language: string; value: string } | { value: string; kind?: string }
): string {
    if (typeof content === 'string') {
        return content
    }
    if ('language' in content) {
        // Make a Markdown code block for this language.
        return '```' + content.language + '\n' + content.value + '\n```'
    }
    return content.value
}
