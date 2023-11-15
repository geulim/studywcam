const Sequelize = require("sequelize");

const User = require("./user");
const Group = require("./group");
const Board = require("./board");
const UserGroup = require("./userGroup");

const env = process.env.NODE_ENV || "development";
const config = require("../config/config")[env];

const db = {};

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

db.sequelize = sequelize;

db.User = User;
db.Group = Group;
db.Board = Board;
db.UserGroup = UserGroup;

User.init(sequelize);
Group.init(sequelize);
Board.init(sequelize);
UserGroup.init(sequelize);

User.associate(db);
Group.associate(db);
Board.associate(db);
UserGroup.associate(db);

module.exports = db;
