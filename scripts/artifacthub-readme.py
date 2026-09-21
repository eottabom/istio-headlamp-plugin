#!/usr/bin/env python3
"""Turn the repository README into the `readme` field of an artifacthub-pkg.yml.

ArtifactHub renders `readme` as the package page. It can also read a README.md
placed beside the manifest, but that would mean committing a second copy of the
README for every release; the inline field keeps it to one file per version.

Two things have to change on the way in:

  - The Install section is dropped. ArtifactHub shows `install` behind its own
    INSTALL button, and the manifest already carries it, so keeping both puts
    the same instructions on the page twice.
  - Relative links are made absolute. The README's image paths resolve on
    GitHub but not on ArtifactHub.

    python3 scripts/artifacthub-readme.py README.md
    python3 scripts/artifacthub-readme.py README.md --manifest artifacthub/0.1.6/artifacthub-pkg.yml
"""
import re
import sys

RAW = 'https://raw.githubusercontent.com/eottabom/istio-headlamp-plugin/main/'
BLOB = 'https://github.com/eottabom/istio-headlamp-plugin/blob/main/'

# Sections that address someone working on the repository rather than someone
# deciding whether to install the plugin.
CONTRIBUTOR_SECTIONS = ('Development', 'Releasing', 'Layout')


def build(readme: str) -> str:
    # An Artifact Hub badge on an Artifact Hub page is circular, and CI status
    # is not what a reader of the package page is after.
    readme = re.sub(r'^\[!\[.*?\)\]\(.*?\)\s*$\n?', '', readme, flags=re.M)

    readme = re.sub(r'^## Install\b.*?(?=^## )', '', readme, flags=re.M | re.S)
    for heading in CONTRIBUTOR_SECTIONS:
        readme = re.sub(rf'^## {heading}\b.*?(?=^## |\Z)', '', readme, flags=re.M | re.S)

    # Markdown links, and the raw HTML <img> the README uses to size one
    # screenshot. Missing the HTML form leaves exactly one broken image on the
    # page, which is easy not to notice.
    readme = re.sub(r'\]\((docs/[^)]+)\)', lambda m: f']({RAW}{m.group(1)})', readme)
    readme = re.sub(r'\]\(\./([^)]+)\)', lambda m: f']({BLOB}{m.group(1)})', readme)
    readme = re.sub(
        r'(<img[^>]*\ssrc=")(docs/[^"]+)(")',
        lambda m: f'{m.group(1)}{RAW}{m.group(2)}{m.group(3)}',
        readme,
    )
    readme = re.sub(
        r'(<a[^>]*\shref=")(docs/[^"]+)(")',
        lambda m: f'{m.group(1)}{RAW}{m.group(2)}{m.group(3)}',
        readme,
    )

    return re.sub(r'\n{3,}', '\n\n', readme).strip() + '\n'


def inject(manifest_path: str, readme: str) -> None:
    """Insert or replace the `readme` block, leaving the rest of the file alone.

    A text edit rather than a YAML round-trip on purpose: the manifest is
    hand-written and commented, and re-serialising it would drop the comments
    explaining why version, archive-url and archive-checksum have to agree.
    """
    manifest = open(manifest_path).read()
    block = 'readme: |\n' + '\n'.join(
        ('  ' + line) if line.strip() else '' for line in readme.rstrip('\n').split('\n')
    ) + '\n'

    if re.search(r'^readme: \|', manifest, flags=re.M):
        manifest = re.sub(r'^readme: \|\n(?:(?:  .*)?\n)*', block, manifest, count=1, flags=re.M)
    else:
        # Above `install:`, so the page content reads before the install notes.
        anchor = re.search(r'^install: \|', manifest, flags=re.M)
        at = anchor.start() if anchor else len(manifest)
        manifest = manifest[:at] + block + manifest[at:]

    open(manifest_path, 'w').write(manifest)


if __name__ == '__main__':
    args = sys.argv[1:]
    manifest = None
    if '--manifest' in args:
        i = args.index('--manifest')
        manifest = args[i + 1]
        args = args[:i] + args[i + 2:]

    readme = build(open(args[0]).read())
    if manifest:
        inject(manifest, readme)
        print(f'{manifest}: readme is {len(readme.splitlines())} lines')
    else:
        sys.stdout.write(readme)
