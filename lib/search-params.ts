/**
 * Next gives server pages a plain object for `searchParams`. Filter param names
 * contain dots (`filter.v.price.gte`), so always convert to real
 * `URLSearchParams` and never route through Next route objects.
 */
export function toURLSearchParams(
  input: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  return params;
}
