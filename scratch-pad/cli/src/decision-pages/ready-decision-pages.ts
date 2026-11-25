import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { readyDecisionPageIds } from './decision-page'

// The ids of the decision pages that the agent has made ready with the command `ready`
export function readyDecisionPages(folder: ScratchPadFolder): ReadonlySet<string> {
  return readyDecisionPageIds(folder.read((pad) => pad.readEvents()))
}
