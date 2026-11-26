# Publishing and marketplace

The `dshmarket` listing installs from the public `main` branch. GitHub Releases identify tagged snapshots.
On 2026-11-26, the market's install source served **1.1.1** and GitHub marked **v1.0.9** as Latest.
[Public package manifest](https://github.com/liuli-zsl/dsh-unreal-engine-skills/blob/main/package.json) · [GitHub Releases](https://github.com/liuli-zsl/dsh-unreal-engine-skills/releases)

## Pre-flight checklist

Check the candidate commit locally. After publishing, read the version and commit back from the selected channel.

- [x] `dsh.bundle` manifest and `cordis.patch.yml` at the repository root (required for `dsh plugin add`).
- [x] MIT license plus upstream Epic Games notice ([`LICENSE`](../LICENSE), [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)).
- [x] Public repository (`liuli-zsl/dsh-unreal-engine-skills`).
- [x] Public-facing README in English and Chinese ([`README.md`](../README.md), [`README.zh.md`](../README.zh.md)).
- [ ] Before committing, check the effective author and committer with `git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT`. Both should use `liuli-zsl` and the maintainer's verified GitHub noreply address. Apply any identity override to this repository or commit and verify the resulting commit before publishing.
- [ ] Record the tested Harness and UE versions when a clean-profile installation and a read-only editor call have been verified. [Verification history](CHANGELOG.md)
- [x] `dsh-plugin` topic on the GitHub repository (required by the list's CI).
- [ ] For a market update, confirm that the default branch points to the approved commit. For a GitHub Release, confirm that its tag resolves to the approved commit.
- [x] [Listing PR #8355](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/8355) merged on 2026-10-20 at 17:52:16 UTC.
- [ ] Screenshots added (optional, recommended — see below).

## Releasing

### Prepare a local commit

1. For each change, increment `version` in `package.json` once, update both READMEs and record the change and its verification in the same commit. [Repository conventions](../AGENTS.md) · [Changelog](CHANGELOG.md)
2. Run the repository checks.

   ```sh
   pnpm install --frozen-lockfile --ignore-scripts
   node --check lib/index.js
   node --check lib/client.js
   pnpm test
   git diff --check
   ```

   `cordis.patch.yml` uses the Harness loader's `!!js` tag. Runtime verification of that expression requires the Harness loader.
3. Review `git status --short` and the diff. Stage only the intended files or hunks, inspect the staged diff, then commit locally. Write the title in Chinese followed by English, separated by ` / `. Pair the two languages in each optional body item as well.

   ```sh
   git diff --cached --check
   git diff --cached
   git commit -m "<中文摘要> / <English summary>"
   git status --short
   git show HEAD:package.json
   ```

   Report the short commit ID and validation results. Ask whether to update `dshmarket` unless the maintainer already decided for this change. [Market update procedure](#updating-an-existing-dshmarket-installation)

### Publish a GitHub Release

1. When the maintainer requests a formal release, select the verified commit and use the version already recorded in its `package.json` and changelog. Set the tag to `v` followed by that version.
2. Check the local tag and the remote tag, including its peeled commit for an annotated tag. Reuse a tag that points to the approved commit. If it points elsewhere, report both commits to the maintainer. If it is absent, create an annotated tag on the approved commit and verify its target.
3. With authorization to publish that tag, push its exact ref, for example `git push origin "refs/tags/$tag:refs/tags/$tag"` with `tag` set to the verified tag name. Keep a market update to `main` as a separate publication decision.
4. Check the remote tag target and the CI result for that commit. Create or verify the same-named GitHub Release using the relevant changelog entries. Confirm the published release URL and any download assets.

## DeepSeek Harness plugin market

The visual plugin market (`dshmarket`) shows the curated list
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin). To appear there, add
an entry **to that list repository** — not to the market application repository
(`dsh-market/dsh-market`). Rules and review criteria are documented in its
[contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md).

The plugin is [listed in the catalog](https://awesome-dsh-plugin.com/p/liuli-zsl/dsh-unreal-engine-skills/); PR #8355 is merged. The steps below are retained as the submission procedure; future listing changes use the update procedure.

The catalog's npm-version index for Harness 0.2.1+ **Plugins → Discover** has narrower coverage than its full GitHub catalog. The upstream [index generator](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/scripts/lib/market-index.mjs) requires an npm package, an exact version and its publish time; it currently skips GitHub-only entries. This is a generator limitation, not a requirement of every Discover index.

On 2026-10-21, the [full catalog](https://awesome-dsh-plugin.com/plugins.json) included this plugin with `npm: null` and `version: null`, while the published npm-version index omitted it. The package remains GitHub-only with `private: true`; catalog acceptance does not establish Discover-index inclusion. npm publication remains optional and requires a separate release decision.

### Submission steps

1. Add the `dsh-plugin` topic to this repository (required; CI reads it).
2. Fork `awesome-dsh-plugin` and add exactly one new file:
   `data/plugins/liuli-zsl__dsh-unreal-engine-skills.yml`

   The ready-to-copy source is [`marketplace/liuli-zsl__dsh-unreal-engine-skills.yml`](marketplace/liuli-zsl__dsh-unreal-engine-skills.yml):

   ```yaml
   url: https://github.com/liuli-zsl/dsh-unreal-engine-skills
   name: liuli-zsl/dsh-unreal-engine-skills
   category: skill
   description:
     en: Connects Harness to Unreal Editor and finds workflows for UE 5.8 and 5.9, with three Epic client skills, offline guidance and live project skills.
     zh: 连接 Harness 与 Unreal Editor，按 UE 5.8 或 5.9 查找引擎工作流，提供三个 Epic 客户端技能、离线指引和当前工程的在线技能。
   ```

   `description.en` is required and must be one line ending with a period. The Chinese line is
   optional. The package ships three Epic client skills and the version-aware workflow lookup.
   The editor's `ModelContextProtocol` plugin and enabled toolsets provide the live tools.

3. Do **not** edit the generated `README.md` / `README.zh.md` in the list repository. They are
   regenerated from `data/plugins/*.yml` after merge.
4. Open one pull request. The list accepts at most three entries per PR; a single-plugin submission
   is one file. Suggested PR body:

   ```text
   Add liuli-zsl/dsh-unreal-engine-skills — a DeepSeek Harness port of Epic's Unreal Engine
   Skills for Claude Code (MIT). One bundle registers three client skills and a workflow
   lookup for UE 5.8 and 5.9, injects Unreal project context, and wires the editor's
   ModelContextProtocol server, with the endpoint editable on the Plugins page and hot-reloaded
   on save.

   - dsh.bundle + cordis.patch.yml at the repository root
   - repo older than one day
   - skills live in skills/*/SKILL.md; the MCP toolsets come from the editor plugins
   ```

   Add a statement that the `dsh-plugin` topic and validation checks are complete only after
   checking their actual state. A draft PR body must not claim unperformed acceptance testing.

5. Wait for review. CI checks the manifest, repository age, formatting and the regenerated README;
   a maintainer then reads the repository and verifies the description against the code. Listings
   usually go live within about a day after merge.

### Updating an existing dshmarket installation

1. After each plugin change, ask the maintainer whether to publish the tested branch and version to `dshmarket`. An explicit market update request for the current change supplies that approval.
2. Find this repository in the [public catalog](https://awesome-dsh-plugin.com/plugins.json) and read its `install` field. The current target, `github:liuli-zsl/dsh-unreal-engine-skills`, follows the repository's default branch. For a version update, push the approved release commit to `main`. The market checks the upstream package version for this GitHub source.
3. Verify the commit advertised by the install target with `git ls-remote --symref origin HEAD` and read `package.json` at that exact public commit. Check that the previous GitHub-installed version is offered the update and that the new version is reported current. A local `link:` checkout uses the files on disk.

For changes to the listing's description, category or install source, update the existing `data/plugins/liuli-zsl__dsh-unreal-engine-skills.yml` through a PR in the catalog repository. Verify the generated catalog after merge.

## Screenshots (optional, recommended)

The market detail page shows App Store-style screenshots. Add 1–8 PNG images to this repository
(for example under `assets/`) and declare them in `screenshots.json` next to `package.json`:

```json
["assets/plugins-page-port-form.png", "assets/editor-mcp-log.png"]
```

Paths are relative to `screenshots.json`, must stay inside this repository, and are picked up on the
next build after a push. Useful shots: the Plugins-page port form, the editor output log showing the
MCP server start, and one real tool call. Without screenshots the market falls back to images
extracted from the README.

## npm package (optional)

Check the package name and intended npm account before publishing:

```sh
npm view dsh-unreal-engine-skills version
```

To publish:

1. Remove `"private": true` from [`package.json`](../package.json). Keep `repository` pointing at
   this repository — the curated list links the npm package to the repository through it.
2. Run `npm publish` (the `files` allowlist already includes `lib/`, `skills/`, `locale/`,
   `icon.svg`, `cordis.patch.yml`, `LICENSE`, `THIRD_PARTY_NOTICES.md` and `README.zh.md`; npm also
   includes `package.json` and the main README automatically).
3. Note that this package ships plain JavaScript with no build step, so installing from GitHub
   source works as well; npm can make the package eligible for this catalog's npm-version index once its mapping, exact version and publish time are recorded. Verify index inclusion after publication; publishing alone is not evidence of inclusion.

## Prebuilt tarball (optional)

To offer a `.tgz`, build it from the tagged commit and inspect its file list. When packaging a working directory, exclude `Docs/Plan/`. Upload the verified asset to the matching GitHub Release, then copy and test its actual download link. A tag-specific URL has the form `https://github.com/liuli-zsl/dsh-unreal-engine-skills/releases/download/<tag>/<asset-name>.tgz`.
