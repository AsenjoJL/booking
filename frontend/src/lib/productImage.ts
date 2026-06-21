type ProductImageConfig = {
  imageFit?: 'cover' | 'contain'
  imageSurfaceClassName?: string
  imagePositionClassName?: string
}

type ProductImageFrame =
  | 'catalog'
  | 'detail'
  | 'thumbnail'
  | 'compact'
  | 'mini'

const containFrameClasses: Record<ProductImageFrame, string> = {
  catalog: 'object-contain object-center px-5 pb-2 pt-6',
  detail: 'object-contain object-center px-8 pb-4 pt-8',
  thumbnail: 'object-contain object-center px-3 pb-1 pt-3',
  compact: 'object-contain object-center px-4 pb-2 pt-5',
  mini: 'object-contain object-center px-2 pb-1 pt-2',
}

export function getProductImageSurfaceClass(config: ProductImageConfig) {
  return config.imageSurfaceClassName ?? ''
}

export function getProductImageClass(config: ProductImageConfig, frame: ProductImageFrame) {
  const imagePositionClassName = config.imagePositionClassName ?? 'object-center'

  if (config.imageFit === 'contain') {
    return `${containFrameClasses[frame]} ${imagePositionClassName}`.trim()
  }

  return `object-cover ${imagePositionClassName}`.trim()
}
