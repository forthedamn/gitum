#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const program = require('commander');
const ini = require('ini');
const echo = require('node-echo');
const open = require('open');
const async = require('async');
const request = require('request');
const only = require('only');
const git = require('simple-git')();
const extend = require('extend');
const debug = require('debug')('gitum');

// git().addConfig('user.name', 'Some One')
//   .addConfig('user.email', 'some@one.com')

const userList = require('./userconfig.json');

const userListPath = path.resolve('./userconfig.json');
const PKG = require('./package.json');

const GIT_CONFIG = path.join(process.env.HOME, '.`gitconfig`');

program
  .version(PKG.version);

program
  .command('ls')
  .description('List all the user config')
  .action(onList);

program
  .command('current')
  .description('Show current registry name')
  .action(showCurrent);

program
  .command('use <userconfig>')
  .description('Change user config to userconfig')
  .action(onUse);

program
  .command('add <registry> <url> [home]')
  .description('Add one custom registry')
  .action(onAdd);

program
  .command('del <registry>')
  .description('Delete one custom registry')
  .action(onDel);

program
  .command('home <registry> [browser]')
  .description('Open the homepage of registry with optional browser')
  .action(onHome);

program
  .command('test [registry]')
  .description('Show response time for specific or all userList')
  .action(onTest);

program
  .command('help')
  .description('Print this help')
  .action(() => {
    program.outputHelp();
  });

program
  .parse(process.argv);


if (process.argv.length === 2) {
  program.outputHelp();
}

/* //////////////// cmd methods ///////////////// */

function onList() {
  getCurrentConfig((cur, cemail, isGlobal) => {
    const info = [''];
    const alluserList = getAllConfig();
    cur = cur.replace('\n', '');
    cemail = cemail.replace('\n', '');

    // 如果没有初始化 list，则回调
    if (alluserList && Object.keys(alluserList).length === 0) {
      debug('alluserList empty');
      alluserList[cur] = {
        username: cur,
        email: cemail,
      };
      setCustomConfig(alluserList, (err) => {
        if (err) return exit(err);
        return null;
      });
    }

    Object.keys(alluserList).forEach((key) => {
      const item = alluserList[key];
      const prefix = item.username === cur ? '* ' : '  ';
      info.push(prefix + key + line(key, 12) + item.email);
    });

    info.push('');
    printMsg(info);
  });
}

function showCurrent() {
  getCurrentConfig((cur) => {
    const alluserList = getAllConfig();
    Object.keys(alluserList).forEach((key) => {
      const item = alluserList[key];
      if (item.registry === cur) {
        printMsg([key]);
      }
    });
  });
}

function onUse(name) {
  const alluserList = getAllConfig();
  debug('alluserList %j', alluserList);
  if (alluserList[name]) {
    const info = alluserList[name];
    git
      .addConfig('user.name', info.username)
      .addConfig('user.email', info.email)
      .exec(() => {
        printMsg([
          '            \n',
          '', `   Local user config has been set to: ${name}`, '',
        ]);
      });
  } else {
    printMsg([
      '', `   Not find user config: ${name}`, '',
    ]);
  }
}

function onDel(name) {
  const customuserList = getCustomConfig();
  if (!customuserList.hasOwnProperty(name)) return;
  getCurrentConfig((cur) => {
    if (cur === customuserList[name].registry) {
      onUse('npm');
    }
    delete customuserList[name];
    setCustomConfig(customuserList, (err) => {
      if (err) return exit(err);
      printMsg([
        '', `  delete registry ${name} success`, '',
      ]);
    });
  });
}

function onAdd(name, url, home) {
  const customuserList = getCustomConfig();
  if (customuserList.hasOwnProperty(name)) return;
  const config = customuserList[name] = {};
  if (url[url.length - 1] !== '/') url += '/'; // ensure url end with /
  config.registry = url;
  if (home) {
    config.home = home;
  }
  setCustomConfig(customuserList, (err) => {
    if (err) return exit(err);
    printMsg([
      '', `  add registry ${name} success`, '',
    ]);
  });
}

function onHome(name, browser) {
  const alluserList = getAllConfig();
  const home = alluserList[name] && alluserList[name].home;
  if (home) {
    const args = [home];
    if (browser) args.push(browser);
    open(...args);
  }
}

function onTest(registry) {
  const alluserList = getAllConfig();

  let toTest;

  if (registry) {
    if (!alluserList.hasOwnProperty(registry)) {
      return;
    }
    toTest = only(alluserList, registry);
  } else {
    toTest = alluserList;
  }

  async.map(Object.keys(toTest), (name, cbk) => {
    const registry = toTest[name];
    const start = +new Date();
    request(`${registry.registry}pedding`, (error) => {
      cbk(null, {
        name,
        registry: registry.registry,
        time: (+new Date() - start),
        error: !!error,
      });
    });
  }, (err, results) => {
    getCurrentConfig((cur) => {
      const msg = [''];
      results.forEach((result) => {
        const prefix = result.registry === cur ? '* ' : '  ';
        const suffix = result.error ? 'Fetch Error' : `${result.time}ms`;
        msg.push(prefix + result.name + line(result.name, 8) + suffix);
      });
      msg.push('');
      printMsg(msg);
    });
  });
}


/* //////////////// helper methods ///////////////// */

/*
 * get current registry
 */
function getCurrentConfig(cbk) {
  git.raw(['config', '--get', 'user.name'], (e, localuser) => {
    if (!localuser) {
      git.raw(['config', '--get', '--global', 'user.name'], (e, globaluser) => {
        if (!globaluser) {
          console.log('no username in local and global');
        } else {
          git.raw(['config', '--get', '--global', 'user.email'], (err, globalemail) => {
            cbk(globaluser, globalemail, 'global');
          });
        }
      });
    } else {
      git.raw(['config', '--get', 'user.email'], (err, localemail) => {
        cbk(localuser, localemail);
      });
    }
  });
}

function getCustomConfig() {
  return fs.existsSync(GIT_CONFIG) ? ini.parse(fs.readFileSync(GIT_CONFIG, 'utf-8')) : {};
}

function setCustomConfig(config, cbk) {
  debug('setCustomConfig %j', config);
  echo(JSON.stringify(config), '>', userListPath, cbk);
}

function getAllConfig() {
  return extend({}, userList, getCustomConfig());
}

function printErr(err) {
  console.error(`an error occured: ${err}`);
}

function printMsg(infos) {
  infos.forEach((info) => {
    console.log(info);
  });
}

/*
 * print message & exit
 */
function exit(err) {
  printErr(err);
  process.exit(1);
}

function line(str, len) {
  const line = new Array(Math.max(1, len - str.length)).join('-');
  return ` ${line} `;
}
