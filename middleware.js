const bodyParser = require('body-parser');
const ObjectID = require("bson-objectid");

const { requestMethods, targetTypes } = require('./constants');
const parse = require('./parse');
const {
  createNotFoundResults,
  createBadRequestResults,
  createInternalServerErrorResults,
  createNotAllowedResults,
  createOkResults,
  createCreatedResults
} = require('./results-generator');
const {
  find,
  insert,
  update,
  remove
} = require('./db-handler');

module.exports = (responseHandler) => {
  return [
    bodyParser.json(),
    requestHandler,
    responseHandler || (
      (req, res) => {
        const { responseCode } = req.fakeServerResults;
        const filteredResults = Object.entries(req.fakeServerResults)
        .reduce((a,[k,v]) => (v == null  || k === 'responseCode' ? a : { ...a, [k]: v }), {});
        res.status(responseCode).json(filteredResults);
      }
    )
  ];
}

async function requestHandler(req, res, next) {
  try {
    const { originalUrl: requestPath , method } = req;
    const requestQuery = [requestMethods.get, requestMethods.delete].includes(method) ? req.query : { };
    const { target, parents } = parse(requestPath, requestQuery);

    if (!target) {
      req.fakeServerResults = createNotAllowedResults(`Requests without a model are not allowed.`);
      return next();
    }

    const handlers = {
      [requestMethods.get]: handleGet,
      [requestMethods.post]: handlePost,
      [requestMethods.delete]: handleDelete,
      [requestMethods.put]: handleUpdate,
      [requestMethods.patch]: handleUpdate, 
    };
    const handler = handlers[method];

    if (!handler) {
      req.fakeServerResults = createNotAllowedResults(`${method} is not allowed. Use ${Object.keys(handlers).join(', ')} instead.`);
      return next();
    }

    req.fakeServerResults = await handler({
      target,
      parents,
      requestBody: req.body,
      method,
      requestQuery: req.query
    });
  } catch(err) {
    console.error(err);
    req.fakeServerResults = createInternalServerErrorResults(err.message || 'Internal Server Error.');
  }
 
  return next();
}

async function handleGet({ 
  target, 
  parents
}) {
  const { type } = target;

  const { errMessage, results } = await find(target, parents);
  if (errMessage) {
    return createNotFoundResults(errMessage);
  };

  return createOkResults({
    [targetTypes.one]: results[0],
    [targetTypes.all]: results,
    [targetTypes.count]: results.length
  }[type]);
}

async function handlePost({ 
  target, 
  parents, 
  requestBody 
}) {
  const { name, type, query } = target;
  if (type === targetTypes.one) {
    return createNotAllowedResults('Cannot update with POST. Use PUT or PATCH instead.');
  } else if(type === targetTypes.count) {
    return createBadRequestResults('Cannot get count with POST. Use GET instead.');
  }

  const { errMessage } = await find(target, parents);
  if (errMessage) {
    return createNotFoundResults(errMessage);
  };

  const newEntity = { ...requestBody, ...query, id: ObjectID() };
  await insert(name, newEntity);
  return createCreatedResults(newEntity);
}

async function handleDelete({ 
  target, 
  parents 
}) {
  const { name, type } = target;
  if(type === targetTypes.count) {
    return createBadRequestResults('Cannot get count with DELETE. Use GET instead.');
  }

  const { errMessage, results } = await find(target, parents);
  if (errMessage) {
    return createNotFoundResults(errMessage);
  }

  const deletedCount = await remove(name, results.map(elem => elem.id));
  return createOkResults(deletedCount);
}

async function handleUpdate({ 
  target, 
  parents, 
  method, 
  requestBody 
}) {
  const { name, type, query } = target;
  if (type === targetTypes.all) {
    return createNotAllowedResults('Cannot update without id.');
  } else if(type === targetTypes.count) {
    return createBadRequestResults('Cannot get count with DELETE. Use GET instead.');
  }

  const { errMessage, results } = await find(target, parents);
  if (errMessage) {
    return createNotFoundResults(errMessage);
  }

  const newEntity = method === requestMethods.put ? 
  { ...requestBody, ...query } : 
  { ...results[0], ...requestBody, ...query};

  await update(name, results[0].id, newEntity);
  return createOkResults(newEntity);
}


