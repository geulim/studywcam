const express = require("express");
const { Group, UserGroup, User, Board } = require("../models");
const isLoggedIn = require("../passport/isLoggedIn");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const group = await Group.findAll();

    return res.status(200).json(group);
  } catch (e) {
    console.error(err);
  }
});

// router.get("/:group_id", async (req, res, next) => {
//   try {
//     const { group_id } = req.params;

//     const groupInfo = await Group.findOne({
//       where: {
//         group_id,
//       },
//       include: [
//         {
//           model: User,
//           as: "Users",
//           through: { attributes: [] },
//           attributes: ["user_id", "name"],
//         },
//       ],
//     });

//     if (!groupInfo) {
//       return res.status(404).send({ message: "Group not found" });
//     }

//     return res.status(200).json(groupInfo);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).send({ message: "Server error" });
//   }
// });

router.get("/:group_id", isLoggedIn, async (req, res, next) => {
  try {
    const { group_id } = req.params;
    const user = req.user;
    // 로그인된 사용자 ID를 얻어옵니다. 예를 들어, 토큰을 사용하는 경우:
    const loggedInUserId = user.user_id; // 이 부분은 실제 로그인 구현에 따라 변경될 수 있습니다.

    const groupInfo = await Group.findOne({
      where: {
        group_id,
      },
      include: [
        {
          model: User,
          as: "Users",
          through: { attributes: [] },
          attributes: ["user_id", "name"],
        },
      ],
    });

    if (!groupInfo) {
      return res.status(404).send({ message: "Group not found" });
    }

    const isMember = groupInfo.Users.some(
      (user) => user.user_id === loggedInUserId
    );

    groupInfo.dataValues.isMember = isMember;

    return res.status(200).json(groupInfo);
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: "Server error" });
  }
});

router.post("/create", isLoggedIn, async (req, res, next) => {
  try {
    const { group_name, group_description } = req.body;
    const user = req.user;

    const exGroup = await Group.findOne({ where: { group_name } });

    if (exGroup) {
      return res.status(409).json({ error: "Group already exists" });
    }

    const newGroup = await Group.create({
      group_name,
      group_description,
      group_user_id: user.user_id,
      group_owner: user.user_id,
    });

    await UserGroup.create({
      group_id: newGroup.group_id,
      user_id: user.user_id,
    });

    return res.status(201).json(newGroup);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:group_id/delete", isLoggedIn, async (req, res, next) => {
  try {
    const { group_id } = req.params;
    const user = req.user;

    const isGroupOwner = await Group.findOne({
      where: {
        group_owner: user.user_id,
      },
    });

    const isGroupMember = await UserGroup.findOne({
      where: {
        group_id: group_id,
        user_id: user.user_id,
      },
    });

    if (!isGroupOwner) {
      return res.status(401).send("Unauthorized");
    }

    if (!isGroupMember) {
      return res.status(401).send("Unauthorized");
    }

    await Group.destroy({ where: { group_id: group_id } });

    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.post("/:group_id/join", isLoggedIn, async (req, res, next) => {
  try {
    const { group_id } = req.params;
    const user = req.user;

    const alreadyJoined = await UserGroup.findOne({
      where: {
        user_id: user.user_id,
        group_id,
      },
    });

    if (alreadyJoined) {
      return res.status(409).json({
        status: "error",
        message: "You are already a member of this group.",
      });
    }

    await UserGroup.create({
      user_id: user.user_id,
      group_id,
    });

    return res.status(200).json({
      status: "success",
      message: "Successfully joined the group.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.post("/:group_id/leave", isLoggedIn, async (req, res, next) => {
  const { group_id } = req.params;
  const user = req.user;

  try {
    const result = await UserGroup.destroy({
      where: {
        group_id,
        user_id: user.user_id,
      },
    });

    if (result) {
      const remainingMembers = await UserGroup.count({
        where: {
          group_id,
        },
      });

      if (remainingMembers === 0) {
        await Group.destroy({
          where: {
            group_id,
          },
        });
      }

      res.status(200).json({ message: "Successfully left the group" });
    } else {
      res.status(404).json({ message: "You are not a member of this group" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/:group_id/detail", isLoggedIn, async (req, res, next) => {
  const { group_id } = req.params;

  try {
    const groupDetail = await Group.findAll({
      where: { group_id },
      include: [
        {
          model: User,
          as: "Users",
          attributes: ["name", "email"],
        },
      ],
    });

    if (groupDetail) {
      res.status(200).json(groupDetail);
    } else {
      res.status(404).json({ message: "Group not found" });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/:group_id/board", isLoggedIn, async (req, res, next) => {
  try {
    const { group_id } = req.params;

    const boards = await Board.findAll({
      where: { group_board_id: group_id },
    });

    return res.status(200).json(boards);
  } catch (e) {
    console.error(e);
    return res.sendStatus(500);
  }
});

router.get("/:group_id/board/:board_id", isLoggedIn, async (req, res, next) => {
  const { group_id, board_id } = req.params;

  const board = await Board.findOne({
    where: { board_id, group_board_id: group_id },
  });

  if (!board) return res.status(404).json({ message: "Board not found" });

  return res.status(200).json(board);
});

router.post("/:group_id/board/create", isLoggedIn, async (req, res, next) => {
  const { title, contents } = req.body;
  const { group_id } = req.params;
  const user = req.user;

  const isMember = await UserGroup.findOne({
    where: {
      user_id: user.user_id,
      group_id: group_id,
    },
  });

  if (!isMember) {
    return res
      .status(403)
      .json({ message: "You are not a member of this group." });
  }

  const newBoard = await Board.create({
    title,
    contents,
    group_board_id: group_id,
    board_user_id: user.user_id,
  });

  return res.status(201).json(newBoard);
});

router.patch(
  "/:group_id/board/:board_id/update",
  isLoggedIn,
  async (req, res, next) => {
    const { title, contents } = req.body;
    const { group_id, board_id } = req.params;

    const user = req.user;

    const board = await Board.findOne({
      where: { board_id, group_board_id: group_id },
    });

    if (!board) return res.status(404).json({ message: "Board not found" });

    if (board.board_user_id !== user.user_id) {
      return res
        .status(403)
        .json({ message: "You are not the author of this post" });
    }

    await board.update({ title, contents });

    return res.status(200).json({ message: "Update successful" });
  }
);

router.delete(
  "/:group_id/board/:board_id/delete",
  isLoggedIn,
  async (req, res, next) => {
    const { group_id, board_id } = req.params;
    const user = req.user;

    const board = await Board.findOne({
      where: { board_id, group_board_id: group_id },
    });

    if (!board) return res.status(404).json({ message: "Board not found" });

    if (board.board_user_id !== user.user_id) {
      return res
        .status(403)
        .json({ message: "You are not the author of this post" });
    }

    await board.destroy();

    return res.status(200).json({ message: "Delete successful" });
  }
);

module.exports = router;
