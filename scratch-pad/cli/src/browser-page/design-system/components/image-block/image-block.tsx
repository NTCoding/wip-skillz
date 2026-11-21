import { FullSizeView } from '../full-size-view/full-size-view'
import './image-block.css'

interface ImageBlockProps {
  readonly src: string
  readonly alt: string
}

export function ImageBlock({ src, alt }: ImageBlockProps) {
  return (
    <FullSizeView label="image">
      <img className="image-block" src={src} alt={alt} />
    </FullSizeView>
  )
}
