// Any origin works here as long as it's an http(s) one: the WHATWG URL
// parser only applies its browser-matching quirks (e.g. treating "\" like
// "/") to "special" schemes, and that's exactly the behavior to mirror.
const PROBE_ORIGIN = "http://same-origin.invalid";

/**
 * Turns an untrusted `?next=` value into a path that's safe to redirect to,
 * or `fallback` if it isn't one.
 *
 * A plain `startsWith("/") && !startsWith("//")` check is NOT enough:
 * browsers (and Next's client-side redirect handling, which goes through
 * `new URL`) treat "/\evil.com" as "//evil.com", i.e. an absolute URL to
 * another site. Resolving the value the same way a browser would and
 * checking the origin is what actually catches every variant.
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(next, PROBE_ORIGIN);
  } catch {
    return fallback;
  }

  if (url.origin !== PROBE_ORIGIN) {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
