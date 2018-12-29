# gitum -- git user manager

[![NPM version][npm-image]][npm-url]

git user config manager,help you easy and fast set git local user config

## Install

```
$ npm install -g gitum
```

## Example

```
$ gum ls

* forthedamn - zhoguoxin@126.com
  zhoguoxin -- zhoguoxin@company.com

```

```
$ gum use zhoguoxin  //switch congi to zhoguoxin

    Local user config has been set to: zhoguoxin

```

## Usage

```
Usage: gum [options] [command]

Options:
  -V, --version           output the version number
  -h, --help              output usage information

Commands:
  ls                      List all the git user config
  use <username>          Change git user config to username
  add <username> <email>  Add one custom user config
  del <username>          Delete one custom user config
  help                    Print this help
```

## LICENSE
MIT


[npm-image]: https://img.shields.io/npm/v/gitum.svg?style=flat-square
[npm-url]: https://npmjs.org/package/gitum
