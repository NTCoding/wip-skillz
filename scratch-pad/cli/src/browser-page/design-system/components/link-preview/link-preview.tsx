import './link-preview.css'

export interface PreviewParagraph {
  readonly text: string
  readonly heading: boolean
}

export interface PreviewContent {
  readonly title: string
  readonly path: string
  readonly paragraphs: readonly PreviewParagraph[]
}

interface LinkPreviewProps extends PreviewContent {
  readonly id: string
}

export function LinkPreview({ id, title, path, paragraphs }: LinkPreviewProps) {
  return (
    <span className="link-preview" role="tooltip" id={id}>
      <span className="link-preview__title">{title}</span>
      <span className="link-preview__path">{path}</span>
      <span className="link-preview__text">
        {paragraphs.map((paragraph, index) => (
          <span
            key={index}
            className="link-preview__paragraph"
            data-heading={paragraph.heading || undefined}
          >
            {paragraph.text}
          </span>
        ))}
      </span>
    </span>
  )
}
