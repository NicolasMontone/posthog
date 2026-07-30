import net from 'node:net'

const LISTEN = 3000
const TARGET = 8234

net
    .createServer((client) => {
        const upstream = net.connect(TARGET, '127.0.0.1')
        client.pipe(upstream)
        upstream.pipe(client)
        const kill = () => {
            client.destroy()
            upstream.destroy()
        }
        client.on('error', kill)
        upstream.on('error', kill)
    })
    .listen(LISTEN, '0.0.0.0', () => {
        console.log(`bridge ${LISTEN} -> ${TARGET}`)
    })
