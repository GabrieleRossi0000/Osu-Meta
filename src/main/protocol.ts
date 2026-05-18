import { net, protocol } from 'electron'
import { pathToFileURL } from 'url'

export function registerBeatmapProtocol(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'beatmap-bg',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        bypassCSP: true
      }
    }
  ])
}

export function setupBeatmapProtocolHandler(): void {
  protocol.handle('beatmap-bg', (request) => {
    const url = new URL(request.url)
    const filePath = decodeURIComponent(url.searchParams.get('path') ?? '')
    if (!filePath) {
      return new Response('Missing path', { status: 400 })
    }
    return net.fetch(pathToFileURL(filePath).href)
  })
}
