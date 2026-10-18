export type LookupItem = {
  id: string
  name: string
  hexCode?: string
  createdAt: string
}

export type ApiResponse<T> = {
  data?: T
  error?: string
}

export type WearType = 'top' | 'bottom' | 'both'
export type ItemStatus = 'active' | 'draft' | 'sold_out' | 'archived'

export type ImageFile = {
  id: string
  file: File
  preview: string
  base64: string
  mimeType: string
  displayOrder: number
  altText: string | null
}

export type VariantInput = {
  size: string
  colorId: string | null
  quantity: number
  sellingPriceOverride: number | null
  costPriceOverride: number | null
}

export type ItemFormData = {
  images: ImageFile[]
  title: string
  description: string
  itemTypeId: string | null
  wearType: WearType | null
  occasionIds: string[]
  tagIds: string[]
  costPrice: string
  sellingPrice: string
  sizes: string[]
  colorIds: string[]
  quantities: Record<string, Record<string, number>>
  priceOverrides: Record<string, Record<string, string>>
  isOneOfAKind: boolean
  status: ItemStatus
}

/** A person shown on an item: who added it / last changed it. */
export type PersonRef = { id: string; name: string }

/** GET /api/items/[id]. Cost fields are present for the owner only (lib/cost.ts). */
export type Item = {
  id: string
  title: string
  description: string | null
  itemTypeId: string | null
  itemTypeName: string | null
  wearType: WearType | null
  status: ItemStatus
  isOneOfAKind: boolean
  sellingPrice: number
  costPrice?: number | null
  captionText: string | null
  createdAt: string
  createdBy: PersonRef | null
  updatedAt: string
  updatedBy: PersonRef | null
  /** Concurrency token: send it back on every change; a stale one gets 409. */
  version: string
  occasions: LookupItem[]
  tags: LookupItem[]
  variants: VariantDetail[]
  images: ImageDetail[]
}

export type VariantDetail = {
  id: string
  size: string
  colorId: string | null
  colorName: string | null
  colorHex: string | null
  quantity: number
  sellingPriceOverride: number | null
  costPriceOverride?: number | null
  displayOrder: number
}

export type ImageDetail = {
  id: string
  cdnUrl: string
  displayOrder: number
  altText: string | null
}
