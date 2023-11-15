const Sequelize = require("sequelize");

class User extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          autoIncrement: true,
          primaryKey: true,
        },
        id: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        refreshToken: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        timestamps: false,
        modelName: "User",
        tableName: "user",
        charset: "utf8",
      }
    );
  }

  static associate(db) {
    db.User.belongsToMany(db.Group, {
      through: db.UserGroup,
      foreignKey: "user_id",
      otherKey: "group_id",
      as: "Groups",
    });

    db.User.hasMany(db.Board, {
      foreignKey: "board_user_id",
      sourceKey: "user_id",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
  }
}

module.exports = User;
