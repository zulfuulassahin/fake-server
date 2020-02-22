const { targetTypes } = require('./constants');

module.exports = (requestPath, requestQuery = { }) => {
  const arr = requestPath
  .toLowerCase()
  .split('/')
  .filter(elem => elem)
  .reduce((result, value, index, arr) => {
    index % 2 === 0 && result.push(arr.slice(index, index + 2));
    return result;
  }, [])
  .reverse()
  .map((pair, i, arr) => { 
    const query = { };
    const result = {
      name: pair[0],
      query
    };

    if (pair.length === 2 && pair[1] !== targetTypes.count) {
      query.id = pair[1];
    }

    if (i < arr.length - 1) {
      const parent = arr[i + 1];
      query[parent[0] + 'Id'] = parent[1];
    }

    if (!i) {
      result.type = pair.length === 1 ? targetTypes.all : (pair[1] === targetTypes.count ? targetTypes.count : targetTypes.one);
    }

    return result;
  })
  .reverse();

  if (arr.length) {
    const target = arr.pop();
    target.query = { ...target.query, ...requestQuery };
    return {
      target,
      parents: arr
    };
  } else {
   return { } 
  }
}