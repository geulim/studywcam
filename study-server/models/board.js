const Sequelize = require("sequelize");

class Board extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        board_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          autoIncrement: true,
          primaryKey: true,
        },
        title: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        contents: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
          allowNull: false,
        },
      },
      {
        sequelize,
        timestamps: false,
        modelName: "Board",
        tableName: "board",
        charset: "utf8",
      }
    );
  }
  static associate(db) {
    db.Board.belongsTo(db.User, {
      foreignKey: "board_user_id",
      targetKey: "user_id",
      onDelete: "cascade",
      onUpdate: "cascade",
    });

    db.Board.belongsTo(db.Group, {
      foreignKey: "group_board_id",
      targetKey: "group_id",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
  }
}
module.exports = Board;
