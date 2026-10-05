import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    wrapper: ({ children }) => (
      <div className="h-screen w-screen overflow-y-auto">
        <div className="container mx-auto flex !w-2/3 flex-col overflow-y-auto py-8">
          {children}
        </div>
      </div>
    ),
    p: ({ children }) => <p className="my-1 text-balance">{children}</p>,
    h1: ({ children }) => (
      <h1 className="mb-4 mt-8 text-4xl font-bold">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 mt-4 text-2xl font-bold">{children}</h2>
    ),
    a: ({ children, href }) => (
      <a className="link" href={href}>
        {children}
      </a>
    ),
    ul: ({ children }) => <ul className="list-disc pl-4">{children}</ul>,
    ...components,
  };
}
