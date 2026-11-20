import { type ServerResponse } from 'node:http'
import { latestEventNumber } from '../events/scratch-pad-event'
import { changedPages, changesOfEvents, type PadChange } from '../pad-changes/pad-change'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

interface WatchedPad {
  readonly browsers: Set<ServerResponse>
  readonly stop: () => void
}

interface PadChangeStreamOptions {
  readonly checkMilliseconds: number
  readonly log: (text: string) => void
}

export class PadChangeStreams {
  private readonly pads = new Map<string, WatchedPad>()

  constructor(private readonly options: PadChangeStreamOptions) {}

  open(folder: ScratchPadFolder, browser: ServerResponse): void {
    const pad = this.pads.get(folder.path) ?? this.watch(folder)
    pad.browsers.add(browser)
    browser.on('close', () => {
      pad.browsers.delete(browser)
      if (pad.browsers.size === 0 && this.pads.get(folder.path) === pad) {
        pad.stop()
        this.pads.delete(folder.path)
      }
    })
    browser.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
    })
    browser.write(': the changes of this scratch pad follow\n\n')
  }

  close(): void {
    this.pads.forEach((pad) => pad.stop())
    this.pads.clear()
  }

  private watch(folder: ScratchPadFolder): WatchedPad {
    const watch = folder.watchPadDb()
    const seen = {
      pages: folder.pageVersions(),
      lastEvent: latestEventNumber(folder.read((pad) => pad.readEvents())),
    }
    const browsers = new Set<ServerResponse>()
    const newEvents = (): PadChange[] => {
      const events = folder
        .read((pad) => pad.readEvents())
        .filter((event) => event.number > seen.lastEvent)
      seen.lastEvent = Math.max(seen.lastEvent, latestEventNumber(events))
      return changesOfEvents(events)
    }
    const check = (): void => {
      const pages = folder.pageVersions()
      const changes = [
        ...changedPages(seen.pages, pages),
        ...(watch.hasChanged() ? newEvents() : []),
      ]
      seen.pages = pages
      changes.forEach((change) =>
        browsers.forEach((browser) => browser.write(`data: ${JSON.stringify(change)}\n\n`)),
      )
    }
    const timer = setInterval(() => {
      try {
        check()
      } catch (error) {
        this.options.log(`The changes of ${folder.name} couldn't be checked: ${String(error)}`)
      }
    }, this.options.checkMilliseconds)
    const pad = {
      browsers,
      stop: () => {
        clearInterval(timer)
        watch.close()
      },
    }
    this.pads.set(folder.path, pad)
    return pad
  }
}
