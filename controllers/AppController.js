import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class AppController {
  static getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    res.status(200).send(status);
  }

  static getStats(req, res) {
    const stats = {
      users: dbClient.nbUsers(),
      files: dbClient.nbFiles(),
    };
    res.status(200).send(stats);
  }
}
