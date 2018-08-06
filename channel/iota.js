var args = process.argv.slice(2);
const presets = require("./presets"+[args[0]])
const IOTA = require("iota.lib.js")
const IOTACrypto = require("iota.crypto.js")
const curl = require('curl.lib.js');
const math = require('mathjs');

const CONSOLE = false
function CONSOLE_LOG(message) {
  if(CONSOLE)
    console.log(message)
}

class iotaCommunication {
   constructor() {
     var userIndex = 0
     var startServer
     var checkAddressBalance
     this.iotaServer = iotaCommunication.startServerSync()
   }

   setUserIndex(userI) {
    this.userIndex = userI
   }

  async startServer() {
    CONSOLE_LOG("CONNECT TO FULL NODE")
    let iotaServer = new IOTA({
        'host': presets.IOTA_HOST,
        'port': presets.IOTA_PORT
    })
    await iotaServer.api.getNodeInfo(function(error, success) {
          if (error) {
              console.error(error);
          } else {
              CONSOLE_LOG(success);
          }
      });
    return iotaServer
  }

  static startServerSync() {
    let iotaServer = new IOTA({
        'host': presets.IOTA_HOST,
        'port': presets.IOTA_PORT
    })
    CONSOLE_LOG("iotaServer.host: " + iotaServer.host)
    return iotaServer
  }

  async initProcess(setSettlementAddress){
    try {
        await this.iotaServer.api.getInputs(presets.SEED, {security: presets.FLASH_CONFIG.SECURITY}, (e, inputs) => {
          if(inputs == undefined){
            CONSOLE_LOG("INPUTS NULL")
            setSettlementAddress(null, null)
          } else {
            let from
            from = inputs.inputs.find(inp => inp.balance == Math.max.apply(Math, inputs.inputs.map(input => input.balance)))
            let self = this
            async function gAddress(){
              await self.iotaServer.api.getNewAddress(presets.SEED, {security: presets.FLASH_CONFIG.SECURITY, index: from.keyIndex}, (e, settlementAddress) => {
                if(settlementAddress == undefined){
                  CONSOLE_LOG("ADDRESS NULL")
                  setSettlementAddress(null, null)
                } else {
                  setSettlementAddress(settlementAddress, from)
                }
              })
            }
            gAddress()
          }
        })
      } catch(e){
        CONSOLE_LOG("Get New Address Error, " + e)
      }
  }

  async getNewAddress(setSettlementAddress) {
    // Deterministically generates a new address for the specified seed with a checksum
    try {
        await this.iotaServer.api.getNewAddress(presets.SEED, {security: presets.FLASH_CONFIG.SECURITY}, (e, settlementAddress) => {
          if(settlementAddress == undefined){
            CONSOLE_LOG("ADDRESS NULL")
            setSettlementAddress(null)
          } else {
            setSettlementAddress(settlementAddress)
          }
        })
      } catch(e){
        CONSOLE_LOG("Get New Address Error, " + e)
      }
  }

  async fundAddress(depositAddress, value, from, settlementAddress, callback) {
    // here we define the transfers object, each entry is an individual transaction
    var fund = [{
        'address': depositAddress,
        'value': value,
        'message': 'FLASH9CHANNEL9TRANSFER'
    }]
    CONSOLE_LOG(fund)
    // We send the transfer from this seed, with depth 4 and minWeightMagnitude 18
    this.iotaServer.api.sendTransfer(presets.SEED, presets.MCMC_DEPTH, presets.MIN_WEIGHT_MAGNITUDE, fund, {security: presets.FLASH_CONFIG.SECURITY, inputs: [from], address: settlementAddress}, function(e, bundle) {
        if (e) {
          CONSOLE_LOG("Error in sending funding transfer, " + e);
          callback(false)
        } else {
          CONSOLE_LOG("Successfully sent funding transfer: ", bundle);
          callback(true)
        }
      })
    }

  //TODO check if confirmed
  //TODO check if original deposit changed

  /*Check if users have deposited money*/
  async checkAddressBalance(depositAddress, settlementAddressesWithIndex, deposits, checkIfConfirmed, fundsValid){
    try {
      let self = this
      self.iotaServer.api.findTransactionObjects({'addresses': [depositAddress]}, function(e, transactionsAll) {
        if (e || transactionsAll === undefined || (transactionsAll.length < deposits.length)) {
          CONSOLE_LOG("Check Address Balance Tx, " + e)
          fundsValid(false)
          return
        } else {
          CONSOLE_LOG("Check Address Balance Tx, " + transactionsAll.length)
          //As a HACK we look for the last three bundles that occured earlier than 4 minutes ago
          // check if the right input addresses (participants) have deposited into the account with the right amount
          /*const transactionsAllSorted = transactionsAll.sort(function(a, b) {
            return parseInt(a.attachmentTimestamp) - parseInt(b.attachmentTimestamp);
          }).filter(a => {let valid = (((Date.now() - a.attachmentTimestamp)/60000) < 4.0); CONSOLE_LOG("Funding tx found: " + valid); return valid;})*/
          const transactions = transactionsAll.slice(Math.max(transactionsAll.length - settlementAddressesWithIndex.length, 0))

          if(transactions !== undefined && transactions.length == deposits.length){
            settlementAddressesWithIndex = settlementAddressesWithIndex.map(s => {s.valid = false; return s;})
            for(let i = 0; i < deposits.length;i++){
              self.iotaServer.api.findTransactionObjects({'bundles': [transactions[i].bundle]}, function(e, inputTransaction) {
                if(inputTransaction !== undefined && inputTransaction.length > 0){
                  //search if address of one of the user settlementaddresses was used as input with correct amount
                  inputTransaction.forEach(tx => {
                    //theoretically we could here check if the input address of user is as defined
                    if(IOTACrypto.utils.addChecksum(tx.address) == depositAddress
                      && tx.value == deposits[i]) {
                        settlementAddressesWithIndex[i].valid = true
                      }
                  })
                }
                //check at the very end if no user id remains that was not found as an input transaction with valid input
                //it is important that it is called inside this innest callback
                if(settlementAddressesWithIndex.filter(s => !s.valid).length == 0){
                  CONSOLE_LOG("Successfully checked balanced!")
                  fundsValid(true)
                  return
                }
              })
            }
          }
          fundsValid(false)
        }
      })
    } catch (e) {
      CONSOLE_LOG("Check Address Balance Error, " + e)
    }
  }

  bundleToTrytes(bundle) {
    var bundleTrytes = []
    bundle.forEach(function(bundleTx) {
      bundleTrytes.push(iotaCommunication.startServerSync().utils.transactionTrytes(bundleTx))
    })
    return bundleTrytes.reverse()
  }

  async sendTrytes(trytes, callback) {
    this.iotaServer.api.sendTrytes(
      trytes,
      presets.MCMC_DEPTH,
      presets.MIN_WEIGHT_MAGNITUDE,
      (e,r) => callback(e,r)
    )
  }

  getBundles(bundles) {
    var ret = []
    for (var bundle of bundles) {
      if (bundle !== null || bundle.value !== 0) {
        ret.push(bundle)
      }
    }
    return ret
  }

  async POWClosedBundle(bundles, callback) {
    try {
      bundles = this.getBundles(bundles)
      CONSOLE_LOG("Attaching the following bundles")
      CONSOLE_LOG(bundles)
      var trytesPerBundle = []
      for (var bundle of bundles) {
        var trytes = this.bundleToTrytes(bundle)
        CONSOLE_LOG("Attaching the following trytes")
        CONSOLE_LOG(trytes)
        trytesPerBundle.push(trytes)
      }
      for (var trytes of trytesPerBundle) {
        if (false) {
          curl.init()
          curl.overrideAttachToTangle(iota)
        }
        var result = await this.sendTrytes(trytes, callback)
      }
      return true;
    } catch (e) {
      CONSOLE_LOG("Error Attaching Final Tx: " + e)
      return e
    }
  }
}

module.exports = {
  iotaCommunication: iotaCommunication,
}
