require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");

const PRIVATE_KEY = "0x63d5c7c4986c799a0e43c0a7653a1f97bb9095ed1dc50d43e7daa23b7acec9ec";
const INFURA_SEPOLIA_URL = "https://sepolia.infura.io/v3/b33f11121c194eadbb5feab9ad2676f7";

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: { count: 10, accountsBalance: "10000000000000000000000" }
    },
    sepolia: {
      url: INFURA_SEPOLIA_URL,
      accounts: [PRIVATE_KEY]
    }
  }
};
