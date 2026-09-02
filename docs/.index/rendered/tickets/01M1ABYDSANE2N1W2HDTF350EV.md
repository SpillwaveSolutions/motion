# Autosave races page teardown, so a write aborts and the E2E gate trips

`01M1ABYDSANE2N1W2HDTF350EV` · task/bug · **done**

Two related problems, one symptom: an in-flight POST /api/fs/write cancelled when the page navigates, which the page-error gate correctly refuses to ignore.

## Hierarchy

- epic: [[Ticket-01M18R79ZMN53CMV76JFHKVEFN]] AI editor: selection, /ai, preview — Three entry points, one pipeline, preview before commit.

## Linked PRs

- [[PR-49]]

## Release

- [[Release-v0.6.1]]
