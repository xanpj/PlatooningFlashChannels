'use strict'

const IOTACrypto = require("iota.crypto.js")
const transfer = require("../lib/flash/transfer.js")
const multisig = require("../lib/flash/multisig.js")
const flashHelpers = require("./../lib/flash/functions.js")
const arrHelpers = require("./../lib/flash/helpers.js")

/*****CONSOLE********/
const CONSOLE = false
const CONSOLE_I = false

function CONSOLE_LOG(message) {
  if(CONSOLE)
    console.log(message)
}
function CONSOLE_LOGI(message) {
  if(CONSOLE_I)
    console.log(message)
}
/*****CONSOLE********/

//////////////////////////////////
// Global Vars

class flash {

  constructor() {
    this.userFlashObject = null
    this.allDigests = []
  }



  //////////////////////////////
  /////////ABSTRACTION 0///////
  ////////////////////////////


  //////////////////////////////////
  // Initial Flash Object
  createFlashObject(userIndex, seed, deposits, config) {
    this.userFlashObject = {
      userIndex: userIndex,
      userSeed: seed,
      index: 0,
      security: config.security,
      depth: config.treeDepth,
      bundles: [],
      partialDigests: [],
      depositAddress: "",
      flash: {
        signersCount: config.signersCount,
        balance: deposits.reduce((acc, v) => acc + v),
        root: [],
        userMultisigs: [],
        deposit: deposits,
        remainderAddress: "",
        outputs: {},
        transfers: []
      }
    }

    CONSOLE_LOG("Flash objects created!\n")
    CONSOLE_LOG(this.userFlashObject)
  }


  //////////////////////////////
  //////  SETUP CHANNEL   //////

  //////////////////////////////
  // GENERATE DIGESTS

  generateDigests(digestAmount){
    const digestOffsetRange = 100000//TODO Make constant
    const digestsStartOffset = Math.floor(Math.random() * digestOffsetRange) + 0
    let partialDigests = []
    for (let i = 0; i < digestAmount; i++) {
      // Create new digest
      const digest = multisig.getDigest(
        this.userFlashObject.userSeed,
        this.userFlashObject.index+digestsStartOffset, //TODO this needs to be different each time
        this.userFlashObject.security
      )
      // Increment key index
      this.userFlashObject.partialDigests.push(digest)
      this.userFlashObject.index++
      partialDigests.push(digest)
    }

    CONSOLE_LOG("Initial digests generated!\n")
    CONSOLE_LOG(this.userFlashObject)

    var digestObject = {userIndex: this.userFlashObject.userIndex, partialDigests: partialDigests}
    return digestObject
  }

  generateAllDigests(){
    //exchange all digests at beginning
    const allDigestsForTree = Math.pow(2, this.userFlashObject.depth);
    return this.generateDigests(allDigestsForTree)
  }

  //////////////////////////////////
  // INITAL MULTISIG

  //partnersDigestsWithIndex = [{userIndex, partialDigests[]}]
  //take only new digests as input
  generateMultiSigAddresses(partnersDigestsWithIndex){
    let oldAddressAmount = 0 //if initial tree is build
    if(this.userFlashObject.flash.userMultisigs.length > 0){
      oldAddressAmount = this.userFlashObject.flash.userMultisigs.length + 1 //+1 because of remainder which was deleted from this arr
    }
    // Add new digests to persisted array of digest
    partnersDigestsWithIndex.forEach((digestObj) => {
      if(this.allDigests[digestObj.userIndex] === undefined){
          this.allDigests[digestObj.userIndex] = []
      }
      this.allDigests[digestObj.userIndex] = this.allDigests[digestObj.userIndex].concat(digestObj.partialDigests) //ADD new digests from other users
    })

    // Generate addresses from new digests
    this.allDigests[0].forEach((d, index) => {
      if(index >= oldAddressAmount) {
        // Create address
        let addy = multisig.composeAddress(
          this.allDigests.map(userDigests => userDigests[index])
        )
        let digest = this.userFlashObject.partialDigests[index]
        // Add key index in
        addy.index = digest.index
        // Add the signing index to the object IMPORTANT
        addy.signingIndex =  this.userFlashObject.userIndex * digest.security
        // Get the sum of all digest security to get address security sum
        addy.securitySum = this.allDigests
          .map(userDigests => userDigests[index])
          .reduce((acc, v) => acc + v.security, 0)
        // Add Security
        addy.security = digest.security
        CONSOLE_LOGI("ADDED ADDRESS")
        CONSOLE_LOGI(addy)
        this.userFlashObject.flash.userMultisigs.push(addy)
      }
    })

    CONSOLE_LOG("Multisigs generated!\n")
    CONSOLE_LOG(this.userFlashObject.flash.userMultisigs)
    //return this.userFlashObject.flash.userMultisigs;
  }

//////////////////////////////////
// CONSUME & ORGANISE ADDRESSES FOR USE

  generateInitialTreeFromMultiSigAddresses(settlementAddressesWithUsers){
    // Set remainder address (Same on both users)
    this.userFlashObject.flash.remainderAddress = this.userFlashObject.flash.userMultisigs.shift() //TODO
    this.updateTreeWithMultiSigs()

    //sort settlementAddresses
    let settlementAddresses = []
    settlementAddressesWithUsers.forEach((settlementAddressObj) => {settlementAddresses[settlementAddressObj.userIndex] = settlementAddressObj.settlementAddress})
    this.userFlashObject.flash.settlementAddresses = settlementAddresses
    CONSOLE_LOGI("Flash Channel this.userFlashObject.flash.settlementAddresses")
    CONSOLE_LOGI(this.userFlashObject.flash.settlementAddresses)

    CONSOLE_LOG(
      "Transactable tokens: ",
      this.userFlashObject.flash.deposit.reduce((acc, v) => acc + v)
    )

    CONSOLE_LOG("Settlement Adress set!\n")
    CONSOLE_LOG(this.userFlashObject)
    CONSOLE_LOG(this.userFlashObject.flash.root.children)
    CONSOLE_LOG("\n")
  }

  updateTreeWithMultiSigs() {
    let multiSigsInTree = this.userFlashObject.flash.userMultisigs.length
    //Proper replacement for nest trees
    function listToTree(treeDepth) {
      let node = {}
      node = list.shift()
      node.children = []
      for(let ii = 0;ii < 2;ii++){
        if(list.length > 0 && treeDepth > 1){
           node.children.push(listToTree(treeDepth-1))
         } else {
           return node
         }
      }
      return node
    }

   var list = arrHelpers.deepClone(this.userFlashObject.flash.userMultisigs)
   let digestTree = listToTree(this.userFlashObject.depth)

   CONSOLE_LOGI("digestTree")
   CONSOLE_LOGI(digestTree)

   this.userFlashObject.depositAddress = IOTACrypto.utils.addChecksum(this.userFlashObject.flash.userMultisigs[0].address)
   // Set Flash root
   this.userFlashObject.flash.root = digestTree //important this returns the nested tree of all addresses
   this.userFlashObject.flash.index = multiSigsInTree + 1;
  }

  updateSettlementAddresses(settlementAddressesWithUsers){
    let settlementAddresses = []
    settlementAddressesWithUsers.forEach((settlementAddressObj) => {settlementAddresses[settlementAddressObj.userIndex] = settlementAddressObj.settlementAddress})
    this.userFlashObject.flash.settlementAddresses = settlementAddresses
  }

  returnUserSettlementAddress(){
   return this.userFlashObject.flash.settlementAddresses[this.userFlashObject.userIndex]
  }

  returnDepositAddress(){
    return this.userFlashObject.depositAddress
  }

  returnUserIndex(){
    return this.userFlashObject.userIndex
  }

  returnCurrentDeposit(){
    let currentDeposit = arrHelpers.deepClone(this.userFlashObject.flash.deposit)
    this.userFlashObject.flash.settlementAddresses.forEach((userAddress,i) => {
      if (userAddress in this.userFlashObject.flash.outputs) {
        currentDeposit[i] += this.userFlashObject.flash.outputs[userAddress]
      }
    })
    return currentDeposit
  }

  returnDeposit(){
    return this.userFlashObject.flash.deposit
  }

  returnRemainderAddress(){
    return this.userFlashObject.flash.remainderAddress
  }

  getDiff(bundles){
    return flashHelpers.getDiff(this.userFlashObject, bundles);
  }

  //////////////////////////////
  //////   TRANSACTING   //////

  //////////////////////////////
  // COMPOSE TX from USER ONE

  generateTransaction(transfers) {

  //CONSOLE_LOG("Creating Transaction")
  //CONSOLE_LOG("Sending 200 tokens to ", twoSettlement)

    // Create TX
    var bundles = flashHelpers.createTransaction(this.userFlashObject, transfers[0].fromIndex, transfers, false)
    CONSOLE_LOG("Bundles Created!\n")
    CONSOLE_LOG(bundles)
    CONSOLE_LOG("\n")

    return bundles
  }

  /////////////////////////////////
  /// SIGN BUNDLES
  generateSignature(bundles){

    CONSOLE_LOG("Signatures Exchange!\n")
    // Get signatures for the bundles
    let signature = flashHelpers.signTransaction(this.userFlashObject, bundles)
    CONSOLE_LOG(signature)
    CONSOLE_LOG("\n")

    return signature;
  }

  applySignatures(bundles, signaturesWithIndex){
      // Sign bundle with your USER ONE'S signatures
      CONSOLE_LOG("Signatures Applied!\n")

      let signedBundles = bundles
      let allSignatures = []
      for(let i = 0; i < signaturesWithIndex.length;i++){
        allSignatures.push(signaturesWithIndex[i].signatures) //TODO just for debug
        signedBundles = transfer.appliedSignatures(signedBundles, signaturesWithIndex[i].signatures) //TODO sort instead
      }
      CONSOLE_LOG("Signatures unos")
      CONSOLE_LOG(allSignatures[0])
      CONSOLE_LOG(signedBundles)
      CONSOLE_LOG("\n")

      return signedBundles
  }

  applyTransfer(signedBundles){
  try {
    // Apply transfers to User ONE
    this.userFlashObject = flashHelpers.applyTransfers(this.userFlashObject, signedBundles)
    // Save latest channel bundles
    this.userFlashObject.bundles = signedBundles
    this.userFlashObject.flash.root.forEach((multisig, i) => {
      let mIndex = this.userFlashObject.flash.userMultisigs.findIndex(m => m.address == multisig.address)
      this.userFlashObject.flash.userMultisigs[mIndex] = multisig
    })

    CONSOLE_LOG("Transfers Applied!\n")
    CONSOLE_LOG(this.userFlashObject)
    CONSOLE_LOG("\n")
  } catch(e) {
    CONSOLE_LOGI(e)
    signedBundles = false
  }
    return signedBundles
  }

  //////////////////////////////
  // CLOSE Channel

  // Supplying the CORRECT varibles to create a closing bundle
  generateClosingTransaction(){
    let bundles = flashHelpers.createTransaction(
      this.userFlashObject,
      this.userFlashObject.userIndex,
      this.userFlashObject.flash.settlementAddresses,
      true
    )
    CONSOLE_LOG("Closing channel!\n")
    CONSOLE_LOG(bundles)
    CONSOLE_LOG("\n")

    return bundles
  }

  //////////////////////////////
  /////////ABSTRACTION 1///////
  ////////////////////////////
  init(userIndex, seed, deposits, config, initDigestsAmount, sendDigestsWithBundle = false) {
    this.createFlashObject(userIndex, seed, deposits, config)
    return (sendDigestsWithBundle) ? this.generateDigests(initDigestsAmount) : this.generateAllDigests()
  }

  compose(partnersDigestsWithIndex, settlementAddressesWithIndex){
    try{
      this.generateMultiSigAddresses(partnersDigestsWithIndex)
      this.generateInitialTreeFromMultiSigAddresses(settlementAddressesWithIndex)
      return true
    }
    catch(err){
      CONSOLE_LOGI(err)
      return false
    }
  }

  prepare(transfers){
    return this.generateTransaction(transfers) //transfersFrom??
  }

  getSignatures(bundles){
    return this.generateSignature(bundles)
  }

  createAdditionalMultiSigs(partnersDigestsWithIndex){
    this.generateMultiSigAddresses(partnersDigestsWithIndex)
    this.updateTreeWithMultiSigs()
  }

  sign(bundles, signaturesWithIndex){
    return this.applySignatures(bundles, signaturesWithIndex)
  }

  transact(signedBundles){
    return this.applyTransfer(signedBundles)
  }

  prepareClosing(){
    return this.generateClosingTransaction()
  }

}

module.exports = {flash:flash}
