import express from 'express';
import AppController from '../controllers/AppController';

export default function controllerRouting(app) {
  const router = express.Router();

  app.use('/', router);

  router.get('/status', (req, res) => {
    AppController.getStatus(req, res);
  });

  router.get('/stats', (req, res) => {
    AppController.getStats(req, res);
  });
}
