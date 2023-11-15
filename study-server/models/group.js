const Sequelize = require("sequelize");

class Group extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        group_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          autoIncrement: true,
          primaryKey: true,
        },
        group_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        group_description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        group_owner: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
      },
      {
        sequelize,
        timestamps: false,
        modelName: "Group",
        tableName: "group",
        charset: "utf8",
      }
    );
  }
  static associate(db) {
    db.Group.hasMany(db.Board, {
      foreignKey: "group_board_id",
      sourceKey: "group_id",
      onDelete: "cascade",
      onUpdate: "cascade",
    });

    db.Group.belongsToMany(db.User, {
      through: db.UserGroup,
      foreignKey: "group_id",
      otherKey: "user_id",
      as: "Users",
    });
  }
}
module.exports = Group;
