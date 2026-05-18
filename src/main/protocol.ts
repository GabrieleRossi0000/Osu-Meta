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
        stream: true
      }
    }
  ])
}

export function setupBeatmapProtocolHandler(): void {
  protocol.handle('beatmap-bg', async (request) => {
    const encoded = request.url.replace(/^beatmap-bg:\/\//, '')
    const filePath = Buffer.from(encoded, 'base64url').toString('utf8')
    return net.fetch(pathToFileURL(filePath).href)
  })
}
