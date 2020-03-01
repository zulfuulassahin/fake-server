const path = require('path');
const { promisify } = require('util');
const fs = require('fs'); 
const exists = promisify(fs.exists);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const { targetTypes } = require('./constants');

const dbFilePath = path.join(__dirname, 'db.json');
let db;

exports.find = find;
exports.insert = insert;
exports.update = update;
exports.remove = remove;

async function find(target, parents) {
  const db = await getDb();

  for (let i = 0; i < parents.length; i++) {
    const { name, query } = parents[i];
    const results = getWithQuery(db, name, query);

    if (!results.length) {
      return { errMessage: `No ${name} with ${stringifyQuery(query)}` };
    }
  };

  const { name, query, type } = target;
  const targetResults = getWithQuery(db, name, query);
  if (type === targetTypes.one && !targetResults.length) {
    return { errMessage: `No ${name} with ${stringifyQuery(query)}` };
  }
  return { results: targetResults };
}

async function insert(modelName, obj) {
  const db = await getDb();
  db[modelName] = db[modelName] || [];
  db[modelName].push(obj);
  await saveDb();
}

async function update(modelName, id, obj) {
  const db = await getDb();
  db[modelName] = db[modelName] || [];
  const targetObjIndex = db[modelName].findIndex(elem => elem.id == id);
  if (targetObjIndex !== -1) {
    db[modelName][targetObjIndex] = {...obj, id};
    await saveDb();
  }
}

async function remove(modelName, ids) {
  const db = await getDb();
  db[modelName] = db[modelName] || [];
  const initialCount = db[modelName].length;
  db[modelName] = db[modelName].filter(elem => !ids.includes(elem.id));
  await saveDb();
  return initialCount - db[modelName].length;
}

async function getDb() {
  if (db) {
    return db;
  }

  const fileExists = await exists(dbFilePath);
  if (!fileExists) {
    db = { };
    await writeFile(dbFilePath, stringifyDb(db));
    return db;
  } else {
    const data = await readFile(dbFilePath);
    db = JSON.parse((data || { }).toString());
    return db;
  }
}

async function saveDb() {
  const db = await getDb();
  await writeFile(dbFilePath, stringifyDb(db));
}

function stringifyDb(db) {
  return JSON.stringify(db, null, 2)
}

function getWithQuery(db, name, query) {
  return (db[name] || []).filter(elem => {
    return Object.keys(query).reduce((result, fieldName) => {
      return result && stringifyValue(elem[fieldName]) === stringifyValue(query[fieldName])
    }, true);
  })
}

function stringifyValue(value) {
  return value === null || value === undefined ? '' : value.toString();
}

function stringifyQuery(query) {
  return Object.keys(query).map(key => `${key}=${query[key]}`).join(', ');
}