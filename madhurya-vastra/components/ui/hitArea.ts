// Invisible touch-area extenders (rules §5.13: tap targets ≥ 44px). They add a transparent
// ::before, centred on the element and at least 44px, so the visible size and the layout stay
// exactly the same. The element must be positioned: add `relative` unless it is already
// absolute / fixed / sticky.

/** Small square controls (icon buttons, avatar): a 44×44 square around the centre. */
export const HIT_AREA =
  "before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2";

/** Wide but short controls (a logo + title link): full width, 44px tall. */
export const HIT_AREA_ROW = "before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2";

/** True when className already positions the element, so `relative` must not be added. */
export const isPositioned = (className?: string) => /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className ?? "");
