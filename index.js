const express = require('express');
const middleware = require('./middleware');

const port = 3000;

module.exports = middleware;

if (require.main === module) {
  const app = express();

  app.use(
    middleware()
  );
  
  app.listen(port, () => console.log(`Fake Server is listening on ${port}!`))
}

