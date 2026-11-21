import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function scratchPadCreatedText(folder: ScratchPadFolder): string {
  return `created ${folder.path}\nselect it with --pad ${folder.name} or SCRATCH_PAD=${folder.name}`
}
