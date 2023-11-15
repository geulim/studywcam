const Sequelize = require("sequelize");

class UserGroup extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {},
      {
        sequelize,
        timestamps: false, // 필요하면 활성화합니다.
        underscored: true,
        modelName: "UserGroup",
        tableName: "user_groups",
        paranoid: false,
        charset: "utf8",
        collate: "utf8_general_ci",
      }
    );
  }

  static associate(db) {
    db.User.belongsToMany(db.Group, {
      through: "UserGroup",
      foreignKey: "user_id",
      otherKey: "group_id",
      timestamps: false,
    });

    db.Group.belongsToMany(db.User, {
      through: "UserGroup",
      foreignKey: "group_id",
      otherKey: "user_id",
      timestamps: false,
    });
  }
}

module.exports = UserGroup;
