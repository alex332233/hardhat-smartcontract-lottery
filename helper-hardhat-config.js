const { ethers } = require("hardhat")

const networkConfig = {
    default: {
        name: "hardhat",
        interval: "30",
    },
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "2149",
        entranceFee: ethers.utils.parseEther("0.01"),
        callbackGasLimit: "500000",
        interval: "30",
    },
    31337: {
        name: "localhost",
        subscriptionId: "0",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // it can be anything, doesn't matter at all
        testinterval1: "100",
        testinterval1: "100",
        testinterval1: "100",
        testinterval1: "100",
        testinterval1: "100",
        testinterval1: "100",
        testinterval1: "100",
        testinterval1: "100",
        testinterval2: "200",
        entranceFee: ethers.utils.parseEther("0.08"),
        callbackGasLimit: "500000",
        interval: "30",
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}
