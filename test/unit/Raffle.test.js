const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffe Unit Tests", function () {
          let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("initializes the raffle correctly!!", async function () {
                  const raffleState = await raffle.getRaffleState()
                  //   const entranceFee = await raffle.getEntranceFee()
                  //   const interval = await raffle.getInterval()

                  //   const vrfCoordinatorV2 = await raffle.getInterval()
                  const subscriptionId = await raffle.getSubscriptionId()
                  const gasLane = await raffle.getGasLane()
                  //   const interval = await raffle.getInterval()
                  const entranceFee = await raffle.getInterval()
                  const callbackGasLimit = await raffle.getCallbackGasLimit()

                  console.log(raffleState)
                  console.log(`suppose to be subscriptionId: ${subscriptionId}`) // incorrect
                  console.log(`suppose to be gasLane: ${gasLane}`) // V
                  console.log(`suppose to be interval: ${interval}`) // V
                  console.log(`suppose to be entranceFee: ${entranceFee}`) //incorrect
                  console.log(`suppose to be callbackGasLimit: ${callbackGasLimit}`) // V
                  assert.equal(raffleState.toString(), "0")
                  //   //   assert.equal(entranceFee, networkConfig[chainId]["entranceFee"])
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enterRaffle", function () {
              it("reverts when you don't pay enough ETH", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughETHEntered"
                  )
              })
              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })
              // test emits event with expect to.emit
              it("emits event on enter", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("doesn't allow entrance when raffle is calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  // time travel: adjust the time to make the raffleState to be "CALCULATING"
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  // Pretend to be a chainlink keeper
                  await raffle.performUpkeep([])
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  )
              })
          })
          describe("checkUpkeep", function () {
              it("returns false if people haven't send any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  //callStatic: simulate calling the transaction and see what it response
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee }) // key differece from the previous it
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([]) // change state to CALCULATING
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(raffleState.toString(), "1") // CALCULATING
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 2])
                  //   console.log(interval.toNumber())
                  //   console.log(interval.toNumber() + 1)
                  //   console.log(interval.toNumber() - 2)
                  //   console.log(interval.toNumber() - 5)
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  //   assert(!upkeepNeeded)
                  assert.equal(upkeepNeeded, false)
              })
              it("returns if enough time has passed, has players, eth, and is open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(upkeepNeeded, true)
              })
          })
          describe("performUpkeep", function () {
              it("can only run if checkupkeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await raffle.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await raffle.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep([])
                  console.log(tx)
                  assert(tx)
              })
              it("reverts when checkupkeep is false", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  )
              })
              it("updates the rafflestate , emits and event, and calls the vrfcoordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await raffle.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await raffle.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  console.log("------------txResponse--------------------")
                  console.log(txResponse)
                  console.log("------------txResponse--------------------")
                  console.log("------------txReceipt--------------------")
                  console.log(txReceipt)
                  console.log("------------txReceipt--------------------")

                  const requestId = txReceipt.events[1].args.requestId // event["1"] instead of event[0] because requestRandomWords already emits an event
                  const raffleState = await raffle.getRaffleState()
                  assert(requestId.toNumber() > 0)
                  assert(raffleState.toString() == "1")
              })
          })
          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await raffle.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await raffle.provider.send("evm_mine", [])
              })
              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
              })

              // below is a bigggg test
              it("picks a winner, resets the lottery, and sends money", async function () {
                  const additionalEntrants = 3
                  const startingAccountIndex = 1 //deployer = 0
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i])
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp()

                  // simulate waiting for the fulfillRandomWords to be called
                  // setup a listner
                  await new Promise(async function (resolve, reject) {
                      /* listener */
                      //   on testnet we cannot mock, so we need to set a listner to evnet fire and start the test
                      raffle.once("WinnerPicked", async function () {
                          console.log("Found the event!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              console.log("----------recentWinner-----------")
                              console.log(recentWinner)
                              console.log("----------recentWinner-----------")
                              console.log(accounts[2].address)
                              console.log(accounts[1].address)
                              console.log(accounts[0].address)
                              console.log(accounts[3].address)
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              const winnerEndingBalance = await accounts[1].getBalance()
                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              // check the winner balance
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      raffleEntranceFee
                                          .mul(additionalEntrants)
                                          .add(raffleEntranceFee)
                                          .toString()
                                  )
                              )
                          } catch (e) {
                              reject(e)
                          }
                          resolve()
                      })
                      /* mocking chainlink keeper*/
                      const tx = await raffle.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance = await accounts[1].getBalance()
                      /* mocking chainlink VRF */
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      )
                  })
              })
          })
      })
