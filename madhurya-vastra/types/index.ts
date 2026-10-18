export type LookupItem = {
  id: string
  name: string
  hexCode?: string
  /** Colours only: second colour of a combination ("Red & Gold"). */
  hexCode2?: string | null
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
  /**
   * Concurrency token: Postgres' own text for updated_at (microseconds kept). Opaque — keep it as a
   * string, send it back unchanged on every change, never turn it into a Date (that drops
   * microseconds, and two saves inside one millisecond would look the same). A stale one gets 409.
   */
  version: string
  occasions: LookupItem[]
  tags: LookupItem[]
  variants: VariantDetail[]
  images: ImageDetail[]
}

/** What a seller receives for an item: no cost fields (built field by field in lib/items.ts). */
export type ItemSellerView = Omit<Item, "costPrice" | "variants"> & { variants: Omit<VariantDetail, "costPriceOverride">[] }

export type VariantDetail = {
  id: string
  size: string
  colorId: string | null
  colorName: string | null
  colorHex: string | null
  colorHex2: string | null
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
