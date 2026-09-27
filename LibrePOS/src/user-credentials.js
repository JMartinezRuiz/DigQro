/**
 * Public sync responses intentionally contain no password or password hash.
 * Never invent a credential for such responses: an empty password tells the
 * sync server to retain its existing hash. First-run credentials are supplied
 * explicitly by defaultUsers instead.
 */
export function localUserPassword(user) {
  return typeof user?.password === "string" ? user.password : "";
}
