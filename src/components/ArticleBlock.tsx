import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Layout } from "@/lib/constants";

/**
 * Renders a markdown article. When layout is split-*, the article sits beside
 * an image; `below` places it under the image full-width.
 */
export function ArticleBlock({
  body,
  layout,
  className = "",
}: {
  body: string;
  layout: Layout;
  className?: string;
}) {
  return (
    <article
      className={`prose prose-sm max-w-none font-sans leading-relaxed text-ink/80 ${
        layout === "below" ? "" : "md:w-1/2"
      } ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </article>
  );
}
