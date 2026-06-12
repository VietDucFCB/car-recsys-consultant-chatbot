/**
 * Renders an assistant chat message as markdown (bold, headings, lists, links).
 * react-markdown does NOT render raw HTML by default, so this is XSS-safe.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MarkdownMessage = ({ content }: { content: string }) => (
  <div className="text-sm leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:ml-1">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings are de-emphasised in a chat bubble — render as bold lines.
        h1: ({ children }) => <p className="font-semibold text-base mt-2 mb-1">{children}</p>,
        h2: ({ children }) => <p className="font-semibold mt-2 mb-1">{children}</p>,
        h3: ({ children }) => <p className="font-semibold mt-2 mb-1">{children}</p>,
        h4: ({ children }) => <p className="font-semibold mt-1.5 mb-0.5">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-0.5">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline hover:text-accent/80"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>
        ),
        hr: () => <hr className="my-3 border-border" />,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

export default MarkdownMessage;
