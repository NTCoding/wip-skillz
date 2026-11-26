import {
  type Assignment,
  type ProgressTracker,
  type Subtask,
  type Task,
} from '../progress-tracker/progress-tracker'
import { type PageLink } from '../rendered-page/page-links'
import { renderDetails, renderLinks, type RenderedPage } from '../rendered-page/rendered-page'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

// The browser only shows the HTML of a task's description, so the Markdown is left out.
interface DescriptionHtml {
  readonly html: string | undefined
  readonly links: readonly PageLink[]
}

// The browser shows the links in what Nick has to do and in why the agent can't do the task.
interface AssignmentOnTracker extends Assignment {
  readonly doHtml: string
  readonly whyHtml: string
  readonly links: readonly PageLink[]
}

interface ItemOnTracker extends DescriptionHtml {
  readonly assignment: AssignmentOnTracker | undefined
}

type SubtaskOnTracker = Omit<Subtask, 'description' | 'assignment'> & ItemOnTracker

interface TaskOnTracker
  extends Omit<Task, 'description' | 'subtasks' | 'assignment'>, ItemOnTracker {
  readonly subtasks: readonly SubtaskOnTracker[]
}

interface TrackerOnTab extends Omit<ProgressTracker, 'tasks'> {
  readonly tasks: readonly TaskOnTracker[]
}

export function progressTrackerOf(folder: ScratchPadFolder): TrackerOnTab {
  const tracker = folder.read((pad) => pad.readProgressTracker())
  return {
    ...tracker,
    tasks: tracker.tasks.map(({ description, subtasks, ...task }) => ({
      ...task,
      ...descriptionHtml(folder, description),
      assignment: assignmentHtml(task.assignment),
      subtasks: subtasks.map(({ description: subtaskDescription, ...subtask }) => ({
        ...subtask,
        ...descriptionHtml(folder, subtaskDescription),
        assignment: assignmentHtml(subtask.assignment),
      })),
    })),
  }
}

function assignmentHtml(assignment: Assignment | undefined): AssignmentOnTracker | undefined {
  if (assignment === undefined) {
    return undefined
  }
  const what = renderLinks(assignment.do)
  const why = renderLinks(assignment.why)
  return {
    ...assignment,
    doHtml: what.html,
    whyHtml: why.html,
    links: [...what.links, ...why.links],
  }
}

function descriptionHtml(
  folder: ScratchPadFolder,
  description: string | undefined,
): DescriptionHtml {
  const rendered = renderedDetails(folder, description)
  return { html: rendered?.html, links: rendered?.links ?? [] }
}

// Renders Markdown that isn't on a page, like the details of an improvement or the description of a
// task. Its links are resolved as if it were on the index page so that `retry-limit.md` is a link
// to that page.
export function renderedDetails(
  folder: ScratchPadFolder,
  markdown: string | undefined,
): RenderedPage | undefined {
  return markdown === undefined
    ? undefined
    : renderDetails({
        page: 'pages/index.md',
        markdown,
        readCustomFile: (file) => folder.readCustomFile(file),
      })
}
