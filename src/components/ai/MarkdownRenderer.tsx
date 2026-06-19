import { useEffect, useRef } from 'react'
import { marked } from 'marked'
import katex from 'katex'
import DOMPurify from 'dompurify'

interface MarkdownRendererProps {
  content: string
}

const renderer = new marked.Renderer()

renderer.code = function (code: string, infostring: string | undefined, _escaped: boolean) {
  const language = (infostring || 'text').replace(/[^a-zA-Z0-9_-]/g, '')
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return `<pre><code class="language-${language}">${escaped}</code></pre>`
}

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
})

function renderMath(text: string): string {
  let result = text

  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })
    } catch {
      return math
    }
  })

  result = result.replace(/\$([^\n$]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })
    } catch {
      return math
    }
  })

  return result
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      // 1. 先渲染数学公式（避免 marked 拆分 $$...$$ 导致正则失效）
      const withMath = renderMath(content)
      // 2. 解析 markdown 为 HTML
      const rawHtml = marked.parse(withMath) as string
      // 3. DOMPurify 清除恶意 HTML（KaTeX 输出也被净化）
      const finalHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['class'] })
      ref.current.innerHTML = finalHtml
    }
  }, [content])

  return <div ref={ref} className="markdown-content text-sm" />
}
