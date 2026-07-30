import { readFile } from 'node:fs/promises'
import type { Plugin } from 'vite'

/**
 * Loads `.yaml` / `.yml` files as raw string modules (default export).
 *
 * PostHog's product code imports recipe YAML with `import x from './foo.yaml?raw'`.
 * The `?raw` suffix is honored by Vite's built-in loader in the normal Django-served
 * setup, but when running the frontend standalone these files live outside the Vite
 * root (`../products`) and the raw query is not reliably applied, so import-analysis
 * tries to parse the YAML as JS. This plugin resolves that by returning the file
 * contents as a JSON-encoded string default export, with or without `?raw`.
 */
export function yamlRawPlugin(): Plugin {
    return {
        name: 'posthog:yaml-raw',
        enforce: 'pre',
        async load(id) {
            const [filePath] = id.split('?')
            if (!filePath.endsWith('.yaml') && !filePath.endsWith('.yml')) {
                return null
            }
            const contents = await readFile(filePath, 'utf-8')
            return {
                code: `export default ${JSON.stringify(contents)}`,
                map: null,
            }
        },
    }
}
