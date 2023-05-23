const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25") //0.25 is the premium. It costs 025LINK.
// on the testnet thers are sponsors who pay for it. on development chain we need to pay it ourselves.
const GAS_PRICE_LINK = 1e9 //link per gas. Calculated value based on the

// While Eth price sky rocket high to $1,000,000,000
// Chainlink Nodes is the one pay the gas fees to give us randomness & do external execution
// so they price of requests change based on the price of gas, thus chainlink node won't go bankrupt

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]
    log("going to if")
    if (developmentChains.includes(network.name)) {
        log("Local network! Deploying mocks...")
        //deploy a mock vrfcoordinator...
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        log("Mocks Deployed!")
        log("----------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
