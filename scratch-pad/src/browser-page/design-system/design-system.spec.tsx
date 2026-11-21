import { composeStories, type Meta, type StoryObj } from '@storybook/react-vite'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { colourModes } from './colour-modes'
import * as designSystem from './design-system'

type StoryModule = { readonly default: Meta } & Readonly<Record<string, StoryObj>>

const storyModules = import.meta.glob<StoryModule>('./components/*/*.stories.tsx', {
  eager: true,
})
const componentFiles = Object.keys(import.meta.glob('./components/*/*.{ts,tsx,css}'))
const componentFolders = [
  ...new Set(componentFiles.map((file) => file.split('/')[2] ?? file)),
].toSorted((first, second) => first.localeCompare(second))

function componentName(folder: string): string {
  return folder.replaceAll(/(?:^|-)([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function storiesOf(folder: string): StoryModule | undefined {
  return storyModules[`./components/${folder}/${folder}.stories.tsx`]
}

describe('the components of the design system', () => {
  it('finds a folder for each component when the components are listed', () => {
    expect(componentFolders).toContain('code-block')
  })

  it.each(componentFolders)(
    'has the component, its CSS, its story and its spec when the folder is %s',
    (folder) => {
      const files = componentFiles.filter((file) => file.startsWith(`./components/${folder}/`))
      expect(files).toStrictEqual(
        expect.arrayContaining([
          `./components/${folder}/${folder}.tsx`,
          `./components/${folder}/${folder}.css`,
          `./components/${folder}/${folder}.stories.tsx`,
          `./components/${folder}/${folder}.spec.tsx`,
        ]),
      )
    },
  )

  it.each(componentFolders)(
    'titles the stories after the exported component when the folder is %s',
    (folder) => {
      const name = componentName(folder)
      expect(storiesOf(folder)?.default.title).toBe(`Design system/${name}`)
      expect(Object.keys(designSystem)).toContain(name)
    },
  )

  it.each(componentFolders)(
    'renders every story in every colour mode when the folder is %s',
    (folder) => {
      const stories = Object.values(composeStories(storiesOf(folder) ?? { default: {} }))
      const rendered = stories.map((story) => {
        const { container, unmount } = render(createElement(story))
        const modes = [...container.querySelectorAll('[data-colour-mode]')].map((panel) =>
          panel.getAttribute('data-colour-mode'),
        )
        unmount()
        return modes
      })
      expect(rendered.length).toBeGreaterThan(0)
      expect(rendered).toStrictEqual(rendered.map(() => [...colourModes]))
    },
  )
})
