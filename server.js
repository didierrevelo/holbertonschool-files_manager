import express from 'express';
import controllerRouting from './routes/index';

const PORT = process.env.PORT || 5000;
const app = express();

app.use(express.json());
controllerRouting(app);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
