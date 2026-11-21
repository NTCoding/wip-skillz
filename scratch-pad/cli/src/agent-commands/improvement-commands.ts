import { editImprovement, findImprovement, logImprovement } from '../improvements/improvements'
import {
  improvementLink,
  improvementsLink,
  textWithLink,
  type ItemLinks,
} from '../item-links/item-links'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function logImprovementFromChat(
  folder: ScratchPadFolder,
  title: string,
  details: string,
  links: ItemLinks,
): string {
  const time = new Date().toISOString()
  const logged = folder.change((pad) => {
    const improvement = pad.saveImprovement(logImprovement({ time, title, details }))
    pad.appendEvent({ time, kind: 'improvement-logged', by: 'agent', item: undefined })
    return improvement
  })
  return textWithLink(
    links,
    `improvement ${logged.number} is logged`,
    improvementLink(links, logged.number),
  )
}

export function editImprovementFromChat(
  folder: ScratchPadFolder,
  number: number,
  title: string,
  details: string,
  links: ItemLinks,
): string {
  const time = new Date().toISOString()
  folder.change((pad) => {
    pad.updateImprovement(editImprovement(pad.readImprovements(), number, { title, details }))
    pad.appendEvent({ time, kind: 'improvement-edited', by: 'agent', item: undefined })
  })
  return textWithLink(links, `improvement ${number} is edited`, improvementLink(links, number))
}

export function deleteImprovementFromChat(
  folder: ScratchPadFolder,
  number: number,
  links: ItemLinks,
): string {
  const time = new Date().toISOString()
  folder.change((pad) => {
    pad.deleteImprovement(findImprovement(pad.readImprovements(), number).number)
    pad.appendEvent({ time, kind: 'improvement-deleted', by: 'agent', item: undefined })
  })
  return textWithLink(links, `improvement ${number} is deleted`, improvementsLink(links))
}
