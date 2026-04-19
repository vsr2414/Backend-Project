const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Order", {
    status: {
      type: DataTypes.ENUM("pending", "paid", "shipped", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
  });
};