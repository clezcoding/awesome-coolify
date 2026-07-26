/**
 * Gate for changesets/action ↔ custom publish script.
 * The action sets outputs.published=true when stdout contains
 * `New tag: <name>@<version>` — only emit that when npm still needs a publish.
 */
export function shouldAnnounceNewTag({ onNpm }) {
  return onNpm !== true;
}

/** True when registry already has name@version (404/network → false). */
export function npmHasVersion(name, version, run) {
  try {
    const out = run(`npm view ${name}@${version} version`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return out === version;
  } catch {
    return false;
  }
}
