const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Setting", {
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
  });
};