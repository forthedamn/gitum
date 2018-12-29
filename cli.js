#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const program = require('commander');
const echo = require('node-echo');
const git = require('simple-git')();
const extend = require('extend');
const debug = require('debug')('gitum');

const userList = require('./userconfig.json');

const userListPath = path.resolve('./userconfig.json');
const PKG = require('./package.json');

// const GIT_CONFIG = path.join(process.env.HOME, '.`gitconfig`');

program
  .version(PKG.version);
// TODO 别名
program
  .command('ls')
  .description('List all the git user config')
  .action(onList);

program
  .command('use <username>')
  .description('Change git user config to username')
  .action(onUse);

program
  .command('add <username> <email>')
  .description('Add one custom user config')
  .action(onAdd);

program
  .command('del <username>')
  .description('Delete one custom user config')
  .action(onDel);

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
  getCurrentConfig((cur, cemail) => {
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

function onUse(name) {
  const alluserList = getAllConfig();
  debug('[onUse] alluserList %j', alluserList);
  if (alluserList[name]) {
    const info = alluserList[name];
    git
      .addConfig('user.name', info.username)
      .addConfig('user.email', info.email)
      .exec(() => {
        printMsg([
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
  if (!customuserList[name]) return;
  getCurrentConfig((cur) => {
    debug('[onDel] cur %s, customuserList.username %s', cur, customuserList[name].username);
    if (cur === customuserList[name].username) {
      printMsg([
        '', ' local user is empty now.', '',
      ]);
      // TODO 清空 git config 配置
    }
    delete customuserList[name];
    setCustomConfig(customuserList, (err) => {
      if (err) return exit(err);
      printMsg([
        '', `  delete user config ${name} success`, '',
      ]);
    });
  });
}

function onAdd(name, email) {
  const customuserList = getCustomConfig();
  debug('[onAdd] customuserList %j', customuserList);
  if (customuserList[name]) return;
  const config = customuserList[name] = {
    username: name,
  };
  config.email = email;
  setCustomConfig(customuserList, (err) => {
    if (err) return exit(err);
    printMsg([
      '', `  add user ${name} success`, '',
    ]);
  });
}

/* //////////////// helper methods ///////////////// */

/*
 * get current registry
 */
function getCurrentConfig(cbk) {
  git.raw(['config', '--get', 'user.name'], (e, localuser) => {
    if (!localuser) {
      // 暂时不兼容 global
      // git.raw(['config', '--get', '--global', 'user.name'], (e, globaluser) => {
      //   if (!globaluser) {
      //     console.log('no username in local and global');
      //   } else {
      //     git.raw(['config', '--get', '--global', 'user.email'], (err, globalemail) => {
      //       cbk(globaluser, globalemail, 'global');
      //     });
      //   }
      // });
      console.log('local user is empty, use gum to add user');
    } else {
      git.raw(['config', '--get', 'user.email'], (err, localemail) => {
        cbk(localuser.replace('\n', ''), localemail.replace('\n', ''));
      });
    }
  });
}

function getCustomConfig() {
  return fs.existsSync(userListPath) ? JSON.parse(fs.readFileSync(userListPath, 'utf-8')) : {};
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
  const _line = new Array(Math.max(1, len - str.length)).join('-');
  return ` ${_line} `;
}
