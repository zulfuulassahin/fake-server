const createErrorResults = (err, responseCode) => errMessage => {
  const results = { err, responseCode };
  if (errMessage) {
    results.errMessage = errMessage
  }
  return results;
};

const createSuccessResults = responseCode => data => {
  return {
    responseCode, 
    data
  }
};

exports.createNotFoundResults = createErrorResults('NOT_FOUND', 404);
exports.createBadRequestResults = createErrorResults('BAD_REQUEST', 400);
exports.createInternalServerErrorResults = createErrorResults('INTERNAL_SERVER_ERROR', 500);
exports.createNotAllowedResults = createErrorResults('NOT_ALLOWED', 405);
exports.createOkResults = createSuccessResults(200);
exports.createCreatedResults = createSuccessResults(201);