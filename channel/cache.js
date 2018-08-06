const templates = require("./varTemplates.js")
const flashChannel = require("./flashChannel.js")
const arrHelpers = require("./../lib/flash/helpers.js")
const helpers = require("./helpers.js")

/* DEBUG for provoking resend logic */
var HackPlausibilityFlag = 2 //off at 2
var HackValidityFlag = 6 //off at 6

/***************CONSOLE*************/
const CONSOLE_VERBOSITY = 5 //default 3
function CONSOLE_LOG(message, priority) {
  if(CONSOLE_VERBOSITY <= priority)
    console.log(message)
}

class cache {
  /************************************/
  /********** CACHE VARS *************/
  /**********************************/
  constructor(){
    this.stageFlags = null
    this.config = null
    this.cache = null
    this.stateChannelCheckObject = null
    this.userOne = null
  }

  resetChannel(){
    this.stageFlags = arrHelpers.deepClone(templates.stageFlagsTemplate)
    this.config = arrHelpers.deepClone(templates.configTemplate)
    this.cache = arrHelpers.deepClone(templates.cacheTemplate)
    this.stateChannelCheckObject = arrHelpers.deepClone(templates.stateChannelCheckObjectTemplate)
    this.userOne = new flashChannel.flash()
    //setTimeout(() => {global.resetOngoing = false}, 30000) //TODO activate to opening of new channel
  }

  /**********************************************************************/
  /********** SUPPORT FUNCTIONS (IN CACHE.JS FOR SIMPLICITY) ***********/
  /********************************************************************/
  deriveNumberOfDigestsToCreate(paymentId){
    //determine how many digests to create for next payment round according to digestsAmountForNextRounds values
    //TODO check array if final round
    let digestAmountToGenerate = this.cache.digestsAmountForNextRounds.slice((paymentId + 1), (paymentId + 1 + 1)).reduce((acc, v) => acc+v)
    return digestAmountToGenerate
  }

  checkDigestsCompleteness(paymentId){
    if(!this.config.channel.sendDigestsWithBundle){
      return true //already checked in the beginning initially
    } else {
      let digestsAmountUntilThisRound = 0
      for(let i = -1;i <= paymentId;i += 1){
        digestsAmountUntilThisRound += this.deriveNumberOfDigestsToCreate(i)
      }
      let partnersDigestsComplete = this.cache.partnerDigests.filter(userDigests => helpers.flat(userDigests).filter(d=>d).length >= digestsAmountUntilThisRound)
      /**Check if all users have submitted their digests and settlementAddresses**/
      if (partnersDigestsComplete.length == this.config.flashConfig.signersCount) {
        CONSOLE_LOG("checkDigestsCompleteness: true", 3)
        return true
      } else {
        CONSOLE_LOG("checkDigestsCompleteness: false", 3)
        return false
      }
    }
  }

  calculateDigestsAmountForNextRounds(treeDepth){
    let digestsAmountArr = []
    let childrenNodesAmount = Math.pow(2, treeDepth)
    let newDigestsAmount = 1
    while(digestsAmountArr.length < childrenNodesAmount){ //TODO change childrenNodesAmount
      let oldDigestsAmountArr = arrHelpers.deepClone(digestsAmountArr)
      digestsAmountArr = digestsAmountArr.concat([newDigestsAmount, 0])
      digestsAmountArr = digestsAmountArr.concat(oldDigestsAmountArr)
      newDigestsAmount+=1
    }
    //result will be i.e. [3,0,1,0,2,0,1,0,3]
    digestsAmountArr = [treeDepth + 1, 0].concat(digestsAmountArr) //precede with number of initTree and 0 //+1 because of remainder address required
    return digestsAmountArr
  }

  /** CHECKING PROPOSAL PLAUSIBILITY **/
  checkProposalPlausibility(payload){
    if(HackPlausibilityFlag < 2){
      HackPlausibilityFlag++
      return false;
    } else {
    //TODO check with payment matrix. would normally be checked by vehicle client
    return true;
    }
  }

  /** CHECKING BUNDLE VALIDITY **/
  checkPaymentValidity(bundles, payload){
    //TODO check if really a closing bundle
    try {
      HackValidityFlag++
      if(!this.isClosingBundle(bundles, payload)){
        CONSOLE_LOG("HackValidityFlag: " + HackValidityFlag, 3)
        if(HackValidityFlag > 4 && HackValidityFlag < 6){
            return false
        } else {
            if(helpers.arraysEqual(
              this.userOne.getDiff(this.cache.lastDerivedBundles).filter(tx => tx.value > 0),
              this.userOne.getDiff(bundles).filter(tx => tx.value > 0)
              )) {
              CONSOLE_LOG("Checked payment Validity: True", 3)
              //check if it fits to the received proposalAmount
              return true
            } else {
              CONSOLE_LOG("Checked payment Validity: False", 3)
              return false
            }
          }
        } else {
            CONSOLE_LOG("Checked payment Validity: Closing Bundle", 3)
            return true
        }
    } catch(e){
      CONSOLE_LOG(e, 3)
      return false
    }
  }

  derivePaymentsFromPaymentMatrix(userIndex){
    let transferMessageCounter = 0
    let transferMessage = []
    for (let i = 0; i < this.config.channel.payment.matrix.length; i++) {
      let amount = this.config.channel.payment.matrix[this.cache.userMatrixMapping.findIndex(user => user.userIndex == userIndex)][i]
      if(amount > 0){
        let settlementAddress = this.cache.settlementAddressesWithIndex.find(settlementAddressObj => {
          return (settlementAddressObj.userIndex == this.cache.userMatrixMapping[i].userIndex)
        }).settlementAddress
        //only one transferMassage per receiver
        transferMessage[transferMessageCounter] = {
          value: amount,
          address: settlementAddress,
          fromIndex: userIndex
        }
        transferMessageCounter++
      }
    }
    //bundle even if there is no value to transfer
    if(transferMessage.length == 0){
      transferMessage.push({
        value: 0,
        address: "",
        fromIndex: userIndex
      })
    }
    return transferMessage
  }

  lastOngoingPayment(){
    let payment = this.cache.initiatedBundles.find(lPayment => ((lPayment !== undefined) && (lPayment.paymentId == this.cache.lastTransactedPaymentNumber + 1))) //TODO in more penalty flags -1 must be increased //resend bundle beginning directly before the one that was successfully transacted //initiatedBundles are always only issued by themselves
    if(payment === undefined){
      payment = this.cache.initiatedBundles.find(lPayment => ((lPayment !== undefined) && (lPayment.paymentId == this.cache.lastTransactedPaymentNumber))) //if bundle was initiated but cthe round could not be finished succesfully
    }
    return payment
  }

  isClosingBundle(bundles, payload){
    //TODO needs to be more complex
    CONSOLE_LOG("payload.paymentIsClosingBundle: " + payload.paymentIsClosingBundle, 3)
    return payload.paymentIsClosingBundle
  }

}

module.exports = {
  cache: cache
}
