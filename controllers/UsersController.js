import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import Queue from 'bull';
// import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import userUtils from '../utils/user';

const userQueue = new Queue('userQueue');

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }

    const existEmail = await dbClient.usersCollection.findOne({ email });

    if (existEmail) {
      return res.status(400).send({ error: 'Already exist' });
    }

    const passwordSha1 = sha1(password);

    let returnResult;
    try {
      returnResult = await dbClient.usersCollection.insertOne({ email, password: passwordSha1 });
    } catch (err) {
      await userQueue.add({});
      return res.status(500).send({ error: 'Error creating user' });
    }

    const user = {
      id: returnResult.insertedId,
      email,
    };

    await userQueue.add({
      userId: returnResult.insertedId.toString(),
    });

    return res.status(201).send(user);
  }

  static async getMe(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const processedUser = { id: user._id, ...user };
    delete processedUser._id;
    delete processedUser.password;

    return response.status(200).send(processedUser);
  }
}
