'use strict';

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const debug = require('debug')('[' + __filename + ']');
const log = require('./utils').log;
const walkSync = require('walk-sync');

const CHAPTERS_FILE = 'chapters.yml';

function mkFileHandler(prefix) {
  return function (file) {
    // handle directory name
    if (file[file.length - 1] === path.sep) {
      const obj = {};
      const key = file;
      const value = path.basename(file);
      obj[key] = value;
      return obj;
    }

    // handle markdown file
    const filePath = path.join(path.resolve(process.cwd(), prefix), file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const h1Regex = /^\s*#\s*([^#].*?)\s*$/m;
    const result = h1Regex.exec(fileContent);
    const obj = {};
    if (result && result[1]) {
      const key = file;
      const value = result[1];
      obj[key] = value;
    } else {
      const key = file;
      const value = path.basename(file);
      obj[key] = value;
    }
    return obj;
  };
}

function chapters(option) {
  log.success('[BEGIN] handle chapters file');

  // find whether user's chapters file exists
  let isChaptersExists;
  try {
    fs.accessSync(path.resolve(process.cwd(), CHAPTERS_FILE));
    isChaptersExists = true;
  } catch (e) {
    isChaptersExists = false;
  }

  debug('does chapters file exists? ' + isChaptersExists);

  // if exists, read it, then return
  let chapters_content;
  let chapters_array;
  if (isChaptersExists) {
    try {
      chapters_content = fs.readFileSync(path.resolve(process.cwd(), CHAPTERS_FILE), 'utf8');
      chapters_array = yaml.safeLoad(chapters_content);
    } catch (e) {
      log.error(e);
      throw e;
    }
    debug('chapter file %o', chapters_array);
    option.chapters = chapters_array;
    log.success('[END] handle chapters file');
    return option;
  }

  // check if the doc dir exists
  try {
    fs.accessSync(path.resolve(process.cwd(), option.dir));
  } catch (e) {
    log.error(e);
    throw e;
  }

  // read the files and directories under the doc dir into an array
  let doc_items = walkSync(path.resolve(process.cwd(), option.dir), { ignore: ['node_modules'] });
  doc_items = doc_items.filter(function (i) {
    if (i[0] === '.' || i[0] === '_') {
      return false;
    }
    return true;
  }).filter(function (i) {
    if (i.substr(-3) === '.md') return true;
    if (i[i.length - 1] === path.sep) return true;
    return false;
  });

  // read markdown file's title
  const doc_array = doc_items.map(mkFileHandler(option.dir));
  try {
    fs.writeFileSync(
      path.resolve(process.cwd(), CHAPTERS_FILE),
      yaml.safeDump(doc_array),
      'utf8'
    );
    log.info('[INFO] create the chapters file');
  } catch (e) {
    log.error(e);
    throw e;
  }
  option.chapters = doc_array;
  log.success('[END] handle chapters file');
  return option;
}

module.exports = chapters;