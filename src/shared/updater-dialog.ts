export type UpdaterDialogKind =
  | 'available'
  | 'up-to-date'
  | 'check-failed'
  | 'install-failed'

export type UpdaterDialogPayload =
  | { kind: 'available'; latestVersion: string; currentVersion: string }
  | { kind: 'up-to-date'; currentVersion: string }
  | { kind: 'check-failed'; message: string }
  | { kind: 'install-failed'; message: string }

export type UpdaterDialogAction = 'install' | 'later' | 'dismiss' | 'open-releases'

export type UpdaterInstallPhase = 'downloading' | 'installing'

export interface UpdaterInstallingPayload {
  latestVersion: string
  phase: UpdaterInstallPhase
}
