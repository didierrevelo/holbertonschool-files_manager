import { ObjectId } from 'mongodb';

const validatedUtils = {
  isValidId(id) {
    try {
      ObjectId(id);
    } catch (err) {
      return false;
    }
    return true;
  },
};

export default validatedUtils;
