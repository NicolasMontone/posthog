import fs from 'fs'
import path from 'path'
import type { Plugin, ViteDevServer } from 'vite'

/**
 * Standalone dev-only backend mock.
 *
 * PostHog's SPA is normally served by Django and driven by its API. When running the
 * frontend on its own (no Django/Postgres/ClickHouse), the app hangs on its loading
 * spinner because `GET /_preflight/` and `GET /api/users/@me/` never resolve.
 *
 * This middleware answers just enough of the boot sequence for the app to render its
 * unauthenticated front door (the login page): a successful preflight and a 401 for
 * every data API call. It is only active for the Vite dev server.
 */
export function mockBackendPlugin(): Plugin {
    const jsonResponse = (res: any, status: number, body: unknown): void => {
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
    }

    const notAuthenticated = {
        type: 'authentication_error',
        code: 'not_authenticated',
        detail: 'Authentication credentials were not provided.',
        attr: null,
    }

    return {
        name: 'posthog-mock-backend',
        configureServer(server: ViteDevServer) {
            const preflightPath = path.resolve(server.config.root, 'src/mocks/fixtures/_preflight.json')

            server.middlewares.use((req, res, next) => {
                const url = (req.url || '').split('?')[0]

                // Preflight: report a healthy, initiated, self-hosted instance so the
                // app advances past the loader and shows the login page.
                if (url === '/_preflight/' || url === '/_preflight' || url === '/api/_preflight/') {
                    try {
                        const preflight = JSON.parse(fs.readFileSync(preflightPath, 'utf8'))
                        return jsonResponse(res, 200, preflight)
                    } catch {
                        return jsonResponse(res, 200, { django: true, initiated: true, cloud: false, realm: 'hosted-clickhouse' })
                    }
                }

                // Any other backend call while unauthenticated returns 401 so the app
                // routes to /login instead of hanging on pending requests.
                if (url.startsWith('/api/') || url === '/api') {
                    return jsonResponse(res, 401, notAuthenticated)
                }

                return next()
            })
        },
    }
}
