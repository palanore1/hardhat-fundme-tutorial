const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendVal = ethers.utils.parseEther("1") //1 ETH

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", async function () {
              it("sets the aggregator addresses correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", async function () {
              it("Fails if you don't send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })
              it("updated the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendVal })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendVal.toString())
              })
              it("adds funder to array of funders", async function () {
                  await fundMe.fund({ value: sendVal })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })
          describe("withdraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendVal })
              })

              it("withdraw ETH from a single funder", async function () {
                  //Arrange
                  const startingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Assert
                  assert.equal(endingFundMeBal, 0)
                  assert.equal(
                      startingFundMeBal.add(startingDeployerBal).toString(),
                      endingDeployerBal.add(gasCost).toString()
                  )
              })
              it("allows us to withdraw with multiple funders", async function () {
                  //Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendVal })
                  }
                  const startingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Assert
                  assert.equal(endingFundMeBal, 0)
                  assert.equal(
                      startingFundMeBal.add(startingDeployerBal).toString(),
                      endingDeployerBal.add(gasCost).toString()
                  )
                  //Make sure funders arrey is set properly
                  await expect(fundMe.getFunder(0)).to.be.reverted
                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })

              it("cheaperWithdraw testing...", async function () {
                  //Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendVal })
                  }
                  const startingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Assert
                  assert.equal(endingFundMeBal, 0)
                  assert.equal(
                      startingFundMeBal.add(startingDeployerBal).toString(),
                      endingDeployerBal.add(gasCost).toString()
                  )
                  //Make sure funders arrey is set properly
                  await expect(fundMe.getFunder(0)).to.be.reverted
                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })

              it("only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const attackerConnectedContract = await fundMe.connect(
                      accounts[1]
                  )
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner")
              })
          })
      })
