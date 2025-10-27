import nextra from 'nextra'

const withNextra = nextra({
  mdxOptions: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

export default withNextra({
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  turbopack: {
    resolveAlias: {
      'next-mdx-import-source-file': './mdx-components.tsx',
    },
  },
})
