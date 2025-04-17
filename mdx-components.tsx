import type {MDXComponents} from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
    return {
        wrapper: ({children}) => <div className="w-screen h-screen overflow-y-auto">
            <div className="flex flex-col container !w-2/3 mx-auto py-8 overflow-y-auto">{children}</div>
        </div>,
        p: ({children}) => <p className="text-balance my-1">{children}</p>,
        h1: ({children}) => <h1 className="font-bold text-4xl mt-8 mb-4">{children}</h1>,
        h2: ({children}) => <h2 className="font-bold text-2xl mt-4 mb-2">{children}</h2>,
        a: ({children, href}) => <a className="link" href={href}>{children}</a>,
        ul: ({children}) => <ul className="list-disc pl-4">{children}</ul>,
        ...components,
    }
}