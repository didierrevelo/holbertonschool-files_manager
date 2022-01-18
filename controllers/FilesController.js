import { ObjectId } from 'mongodb';
// import sha1 from 'sha1';
import Queue from 'bull';
// import redisClient from '../utils/redis';
// import dbClient from '../utils/db';
import userUtils from '../utils/user';
// import mime from 'mime-types';
import validatedUtils from '../utils/validatedUtils';
import fileUtils from '../utils/file';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const fileQueue = new Queue('fileQueue');

export default class FilesController {
  static async postUpload(req, res) {
    const { userId } = await userUtils.getUserIdAndKey(req);

    if (!validatedUtils.isValidId(userId)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    if (!userId && req.body.type === 'image') {
      await fileQueue.add({});
    }

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const { error: validationError, fileParams } = await fileUtils.validateBody(
      req,
    );

    if (validationError) {
      return res.status(400).send({ error: validationError });
    }

    if (fileParams.parentId !== 0 && !validatedUtils.isValidId(fileParams.parentId)) {
      return res.status(400).send({ error: 'Parent not found' });
    }

    const { error, code, newFile } = await fileUtils.saveFile(
      userId,
      fileParams,
      FOLDER_PATH,
    );

    if (error) {
      if (res.body.type === 'image') await fileQueue.add({ userId });
      return res.status(code).send(error);
    }

    if (fileParams.type === 'image') {
      await fileQueue.add({
        fileId: newFile.id.toString(),
        userId: newFile.userId.toString(),
      });
    }

    return res.status(201).send(newFile);
  }

  static async getShow(req, res) {
    const fileId = req.params.id;

    const { userId } = await userUtils.getUserIdAndKey(req);

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    if (!validatedUtils.isValidId(fileId) || !validatedUtils.isValidId(userId)) {
      return res.status(404).send({ error: 'Not found' });
    }

    const result = await fileUtils.getFile({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!result) return res.status(404).send({ error: 'Not found' });

    const file = fileUtils.processFile(result);

    return res.status(200).send(file);
  }

  static async getIndex(req, res) {
    const { userId } = await userUtils.getUserIdAndKey(req);

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    let parentId = req.query.parentId || '0';

    if (parentId === '0') parentId = 0;

    let page = Number(req.query.page) || 0;

    if (Number.isNaN(page)) page = 0;

    if (parentId !== 0 && parentId !== '0') {
      if (!validatedUtils.isValidId(parentId)) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      parentId = ObjectId(parentId);

      const folder = await fileUtils.getFile({
        _id: ObjectId(parentId),
      });

      if (!folder || folder.type !== 'folder') return res.status(200).send([]);
    }

    const pipeline = [
      { $match: { parentId } },
      { $skip: page * 20 },
      {
        $limit: 20,
      },
    ];

    const fileCursor = await fileUtils.getFilesOfParentId(pipeline);

    const fileList = [];
    await fileCursor.forEach((doc) => {
      const document = fileUtils.processFile(doc);
      fileList.push(document);
    });

    return res.status(200).send(fileList);
  }
}
