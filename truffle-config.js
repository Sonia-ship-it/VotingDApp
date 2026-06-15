module.exports = {
  contracts_build_directory: "./src/contracts",
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: 1337, // Match MetaMask's default localhost chain ID
    },
  },
  mocha: {},
  compilers: {
    solc: {
      version: "0.8.0",
    }
  },
};
