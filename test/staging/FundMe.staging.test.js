const { assert } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          const sendVal = ethers.utils.parseEther("1")
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              fundMe = await ethers.getContract("FundMe", deployer)
          })
          it("lets people to fund and withdraw", async function () {
              await fundMe.fund({ value: sendVal })
              await fundMe.withdraw()
              const endingBal = await fundMe.provider.getBalance(fundMe.address)
              assert.equal(endingBal.toString(), "0")
          })
      })
