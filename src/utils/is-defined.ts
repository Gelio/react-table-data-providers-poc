export function isDefined<T>(x: T): x is Exclude<T, null | undefined> {
  return !!x;
}
