require('dotenv').config();
const app = require('./src/app');
const { PORT } = require('./src/config/constants');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});