function normalizeText(text = '') {
  return String(text ?? '')
}

export function countMixedTokens(text = '') {
  const matches = normalizeText(text).match(/[\u4e00-\u9fff]|[a-zA-Z0-9]+/g) || []
  return matches.length
}

export function splitParagraphs(text = '') {
  return normalizeText(text)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function findForwardBreak(text, startIndex, maxLookahead = 160) {
  const tail = text.slice(startIndex, startIndex + maxLookahead)
  const offset = tail.search(/[\s.,!?;:"'，。！？；：「」【】、\n]/)
  return offset >= 0 ? startIndex + offset + 1 : -1
}

function findBackwardBreak(text, fromIndex, minIndex = 0) {
  const segment = text.slice(minIndex, fromIndex)
  const lastBreak = Math.max(
    segment.lastIndexOf(' '),
    segment.lastIndexOf('\n'),
    segment.lastIndexOf('。'),
    segment.lastIndexOf('，'),
    segment.lastIndexOf('、'),
    segment.lastIndexOf('.'),
    segment.lastIndexOf('!'),
    segment.lastIndexOf('?'),
    segment.lastIndexOf('；'),
    segment.lastIndexOf(';'),
    segment.lastIndexOf('：'),
    segment.lastIndexOf(':')
  )

  return lastBreak >= 0 ? minIndex + lastBreak + 1 : -1
}

export function splitTextIntoChunksNoCut(text = '', chunkSize = 1200, lookahead = 160) {
  const input = normalizeText(text)
  if (!input) return ['']

  const chunks = []
  let start = 0

  while (start < input.length) {
    let end = start + chunkSize

    if (end >= input.length) {
      chunks.push(input.slice(start))
      break
    }

    const forwardBreak = findForwardBreak(input, end, lookahead)
    if (forwardBreak > end) {
      end = forwardBreak
    } else {
      const backwardBreak = findBackwardBreak(input, end, start)
      if (backwardBreak > start) {
        end = backwardBreak
      }
    }

    if (end <= start) {
      end = Math.min(start + chunkSize, input.length)
    }

    chunks.push(input.slice(start, end).trim())
    start = end
  }

  return chunks.filter(Boolean)
}

/**
 * 優先按段落切；如果段落太長，再做細切。
 * 更適合前端 load more / incremental render。
 */
export function splitTextForDisplay(text = '', options = {}) {
  const {
    chunkSize = 1200,
    lookahead = 160,
    largeParagraphThreshold = 1600,
  } = options

  const paragraphs = splitParagraphs(text)
  if (!paragraphs.length) return ['']

  const result = []

  for (const paragraph of paragraphs) {
    if (paragraph.length <= largeParagraphThreshold) {
      result.push(paragraph)
      continue
    }

    const subChunks = splitTextIntoChunksNoCut(paragraph, chunkSize, lookahead)
    result.push(...subChunks)
  }

  return result.filter(Boolean)
}

export function isLongText(text = '', tokenThreshold = 900) {
  return countMixedTokens(text) > tokenThreshold
}

/**
 * 依文字長度與 token 量，給 UI 一個建議的首次顯示數量與每次 load more 數量
 */
export function getChunkRenderPlan(text = '', options = {}) {
  const {
    tokenThreshold = 900,
    shortStep = 6,
    longStep = 3,
    chunkSize = 1200,
  } = options

  const tokenCount = countMixedTokens(text)
  const chunks = splitTextForDisplay(text, { chunkSize })

  const isLong = tokenCount > tokenThreshold || chunks.length > 6
  const step = isLong ? longStep : shortStep

  return {
    tokenCount,
    chunkCount: chunks.length,
    isLong,
    initialVisibleCount: step,
    loadMoreStep: step,
    chunks,
  }
}