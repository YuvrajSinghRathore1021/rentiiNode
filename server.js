require('dotenv').config();
const app = require('./src/app');
const { PORT } = require('./src/config/constants');

// app.listen(PORT, () => {
//   console.log(`Server is running at http://localhost:${PORT}`);
// });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
//  // http://192.168.1.10:2100/api/home/viewGet


//      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozLCJuYW1lIjoieXV2cmFqIHNpbmdoIiwiZW1haWwiOiJ0ZXN0MkBnbWFpbC5jb20iLCJwYXNzd29yZF9oYXNoIjoiJDJiJDEwJHBlRHBJUW04MnVmYlBRazhReHFXRmVHZ0szU3VLd1hvQ0kveUZGSDd1WGx6ZGNZanNkNXVHIiwicGFzc3dvcmQiOiIxMjM0NTYiLCJwaG9uZV9udW1iZXIiOiI3Njc2OTI5NDQwIiwicHJvZmlsZV9waWN0dXJlX3VybCI6bnVsbCwiYWJvdXQiOm51bGwsImNyZWF0ZWRfYXQiOiIyMDI1LTA3LTEwVDA1OjU5OjEzLjAwMFoiLCJ1cGRhdGVkX2F0IjoiMjAyNS0wNy0xMFQwNTo1OToxMy4wMDBaIiwiaXNfaG9zdCI6MCwiaXNfdmVyaWZpZWQiOjAsImdvdmVybm1lbnRfaWQiOm51bGwsInN0YXR1cyI6MSwiaWF0IjoxNzUyMTI3MzE1LCJleHAiOjE3Njc2MDczMTV9.g_aZtrlNMvbZdDwNoITJiDQgWEX_m65hNorKxfL2tYc