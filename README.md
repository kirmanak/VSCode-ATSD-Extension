# Axibase Charts Syntax

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/733f4b159db44cff920edc92721d0e38)](https://app.codacy.com/app/kirmanak/Axibase-Charts-Syntax?utm_source=github.com&utm_medium=referral&utm_content=kirmanak/Axibase-Charts-Syntax&utm_campaign=badger)
[![Build Status](https://travis-ci.org/kirmanak/Axibase-Charts-Syntax.svg?branch=master)](https://travis-ci.org/kirmanak/Axibase-Charts-Syntax)

VSCode extension supporting [Axibase Charts](https://github.com/axibase/charts/blob/master/README.md) syntax. The plugin performs syntax highlighting and validation.

## Installation

* Clone `Axibase Charts Syntax` repository.

```bash
git clone https://github.com/kirmanak/axibase-charts-syntax.git ~/.vscode/extensions/axibase-charts
```

* `cd` into the newly created directory.

```bash
cd ~/.vscode/extensions/axibase-charts
```

* Install node modules and compile the extension.

```bash
npm install && npm run compile
```

* Plugin is ready to handle `.ac` extension files.
  * See examples in ``~/.vscode/extensions/axibase-charts/examples/``.

## Features

### Snippets

* `wgt`: creates a new `[widget]` section with child `[series]` section
* `cfg`: creates a new `[configuration]` section with child `[group]` section and several initial settings