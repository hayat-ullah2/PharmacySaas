// Rewrite a Cloudinary delivery URL to fetch a right-sized, auto-optimised
// image instead of the full-resolution original. Cloudinary applies the
// transform on its CDN edge, so a 36px list thumbnail downloads as ~a few KB
// instead of the multi-hundred-KB upload.
//
//   f_auto      → best format the browser accepts (AVIF/WebP/…)
//   q_auto      → automatic quality (visually lossless, much smaller)
//   dpr_auto    → serve @2x on retina without us hard-coding it
//   c_fill,w,h  → crop/scale to the box we actually render
//
// Non-Cloudinary URLs (blob: previews, data: URIs, other hosts) are returned
// unchanged, so this is always safe to wrap around any image src.
const MARKER = "/image/upload/";

export function cldThumb(
  url: string | undefined | null,
  opts: { w: number; h?: number } = { w: 400 },
): string | undefined {
  if (!url) return url ?? undefined;
  const at = url.indexOf(MARKER);
  if (at === -1) return url;
  const { w, h } = opts;
  const tf = ["c_fill", `w_${w}`, h ? `h_${h}` : "", "f_auto", "q_auto", "dpr_auto"]
    .filter(Boolean)
    .join(",");
  const start = at + MARKER.length;
  return `${url.slice(0, start)}${tf}/${url.slice(start)}`;
}
