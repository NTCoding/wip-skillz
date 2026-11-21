import { itemLinks } from './item-links'

export const exportJobAddress = 'http://127.0.0.1:4747/2026-03-14-export-job/'

export const servedLinks = itemLinks('2026-03-14-export-job', 4747)

export const unservedLinks = itemLinks('2026-03-14-export-job', undefined)

export const missingLinksText =
  "there aren't any links because the server isn't running (scratch-pad start --pad 2026-03-14-export-job)"
