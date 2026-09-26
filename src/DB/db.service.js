/**
 * Generic data-access layer wrapping a Mongoose model.
 * Business logic (in modules/*.service.js) calls these methods instead
 * of importing models directly — keeps Mongoose specifics out of the
 * service/controller layers and gives one place to add logging,
 * soft-delete filtering, etc.
 */
class DBService {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return this.model.create(data);
  }

  async findById(id, { select, populate } = {}) {
    let query = this.model.findById(id);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    return query;
  }

  async findOne(filter = {}, { select, populate } = {}) {
    let query = this.model.findOne(filter);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    return query;
  }

  async find(filter = {}, { select, sort, skip, limit, populate } = {}) {
    let query = this.model.find(filter);
    if (select) query = query.select(select);
    if (sort) query = query.sort(sort);
    if (typeof skip === "number") query = query.skip(skip);
    if (typeof limit === "number") query = query.limit(limit);
    if (populate) query = query.populate(populate);
    return query;
  }

  async updateOne(filter, update, options = { new: true }) {
    return this.model.findOneAndUpdate(filter, update, options);
  }

  async updateById(id, update, options = { new: true }) {
    return this.model.findByIdAndUpdate(id, update, options);
  }

  async deleteOne(filter) {
    return this.model.findOneAndDelete(filter);
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async exists(filter = {}) {
    return this.model.exists(filter);
  }
}

export default DBService;
