/****************IMPORT***************/
/**functions**/
const iotaCommunication = require('./iota.js')
const channelFunctions = require("./cache.js")
/**helpers**/
const arrHelpers = require("./../lib/flash/helpers.js")
const helpers = require("./helpers.js")
/**constants**/
var args = process.argv.slice(2);
const presets = require("./presets"+[args[0]])
const constants = require("./constants.js")
const templates = require("./varTemplates.js")
/**external libs**/
const math = require('mathjs')
const dgram = require('dgram') // dgram Klasse für UDP-Verbindungen


/*************DEBUG FLAGS*************/
const DEBUG = false
const DEBUG_TWO_PORTS = true
const DEBUG_OFFLINE = true
const DEBUG_MANY_DIGESTS = false //default false
const PAYMENT_AMOUNT = 6
const MANY_DIGESTS_SEND_INTERVAL = 100
const TIME_WAITING_FOR_IOTA_TX = 20000
const UDP_MAXSIZE = 1100
const RESEND_PACKAGE_TIME = 600 //working well for In_Network
const RV_BUFFER_SIZE = 3194304
const SD_BUFFER_SIZE = 3194304

/***************CONSOLE*************/
const CONSOLE_VERBOSITY = 5 //default 3
const CONSOLE_TIME_FLAG = true
function CONSOLE_LOG(message, priority) {
  if(CONSOLE_VERBOSITY <= priority)
    console.log(message)
}
function CONSOLE_TIME(message) {
  if(CONSOLE_TIME_FLAG)
    console.log(message)
}

/***************************** APPLICATION STARTS********************************/
/********************************************************/
/*********************IOTA CONNECT**********************/
/******************************************************/
var iota = new iotaCommunication.iotaCommunication()
var cache = new channelFunctions.cache()

/**********************************************************/
/****************FLASH CHANNEL SETUP**********************/
/********************************************************/
var userOne
var config
var stageFlags
var stateChannelCheckObject
var global = {resetOngoing: false}
cache.resetChannel()

CONSOLE_TIME("CONFIG:AWSCore8")
CONSOLE_TIME(JSON.stringify(presets))

CONSOLE_TIME("")
CONSOLE_TIME("START:"+Date.now())

/**********************************************/
/************UDP SERVER/CLIENT SETUP**********/
/********************************************/
var server = dgram.createSocket('udp4'); // IPv4 UDP Socket erstellen


if(DEBUG_TWO_PORTS){
  server.bind(presets.PORT, presets.HOST);
} else {
  server.bind(presets.BROADCAST_PORT, presets.BROADCAST_HOST);
}

server.on('listening', function() {
  var srvadr = server.address();
  server.setRecvBufferSize(RV_BUFFER_SIZE)
  CONSOLE_LOG('UDP Server listening on ' + srvadr.address + ":" + srvadr.port, 3);
})


var client = dgram.createSocket('udp4');
if(!DEBUG_TWO_PORTS){
  client.bind(1236, '0.0.0.0') //TODO CHANGE port for debugging
  client.on('listening', function(){
      client.setSendBufferSize(SD_BUFFER_SIZE)
      client.setBroadcast(true);
  });
}

const UDPSend = async (messageContent) => {
  try {
      let message
      let messageType = messageContent.type
      message = Buffer.from(JSON.stringify(messageContent))

      if(DEBUG_TWO_PORTS){
        await client.send(message, 0, message.length, presets.SEND_PORT, presets.SEND_HOST, function(err, bytes) {
          CONSOLE_LOG('UDP messageID: ' + messageContent.id + ' ' + messageType + ' sent to ' + presets.SEND_HOST + ':' + presets.SEND_PORT, 3)
        })
        await client.send(message, 0, message.length, presets.SEND_PORT_2, presets.SEND_HOST_2, function(err, bytes) {
          CONSOLE_LOG('UDP messageID: ' + messageContent.id + ' ' + messageType + ' sent to ' + presets.SEND_HOST_2 + ':' + presets.SEND_PORT_2, 2)
        })
        await client.send(message, 0, message.length, presets.SEND_PORT_3, presets.SEND_HOST_3, function(err, bytes) {
          CONSOLE_LOG('UDP messageID: ' + messageContent.id + ' ' + messageType + ' sent to ' + presets.SEND_HOST_3 + ':' + presets.SEND_PORT_3, 2)
        })
        await client.send(message, 0, message.length, presets.SEND_PORT_4, presets.SEND_HOST_4, function(err, bytes) {
          CONSOLE_LOG('UDP messageID: ' + messageContent.id + ' ' + messageType + ' sent to ' + presets.SEND_HOST_4 + ':' + presets.SEND_PORT_4, 2)
        })
        await client.send(message, 0, message.length, presets.SEND_PORT_5, presets.SEND_HOST_5, function(err, bytes) {
          CONSOLE_LOG('UDP messageID: ' + messageContent.id + ' ' + messageType + ' sent to ' + presets.SEND_HOST_5 + ':' + presets.SEND_PORT_5, 2)
        })
        await client.send(message, 0, message.length, presets.PORT, presets.HOST, function(err, bytes) {
          CONSOLE_LOG('UDP messageID: ' + messageContent.id +' sent to own ' + presets.HOST + ':' + presets.PORT, 2)
        })
      } else {
          const messagesNumToSend = Math.ceil(message.length / UDP_MAXSIZE)
          let subPackagesRequired = false
          if(messagesNumToSend > 1.0){
            //add identifier
            subPackagesRequired = true
          }

          let tempBuffer
          let offset = 0
          let messagePartId = 0
          let messageComplete = 0

          var sendSubPackageInterval
          var dropSubPackageInterval = false

          const sendSubPackage = async () => {
            if(messageComplete < message.length) {
              if(subPackagesRequired){
                //add individual subpackage identifier for reassambling
                const preMessageStart = constants.EMPTY_STR
                const preMessage = preMessageStart.concat(constants.SUBPACKAGE_SPLITSIGN, messagePartId, constants.SUBPACKAGE_SPLITSIGN, messageContent.id, constants.SUBPACKAGE_SPLITSIGN)
                const preMessageBuffer = Buffer.from(preMessage)
                let messagePartLength
                let isLastMessagePart = 0
                if(((message.length - messageComplete) + preMessageBuffer.length + isLastMessagePart.toString().length) > UDP_MAXSIZE){
                  messagePartLength = UDP_MAXSIZE - preMessageBuffer.length - isLastMessagePart.toString().length
                } else {
                  messagePartLength = message.length - messageComplete
                  isLastMessagePart = 1
                }
                const isLastMessagePartBuffer = Buffer.from(isLastMessagePart.toString())

                tempBuffer = new Buffer(isLastMessagePartBuffer.length + preMessageBuffer.length + messagePartLength)
                //copy(TO, TO START, FROM START, FROM END)
                message.copy(tempBuffer, isLastMessagePartBuffer.length + preMessageBuffer.length, messageComplete, messageComplete + messagePartLength);
                preMessageBuffer.copy(tempBuffer, isLastMessagePartBuffer.length, 0, preMessageBuffer.length);
                isLastMessagePartBuffer.copy(tempBuffer, 0, 0, isLastMessagePartBuffer.length);
                messageComplete += messagePartLength
              } else {
                tempBuffer = message
                messageComplete += tempBuffer.length
              }

              await client.send(tempBuffer, 0, tempBuffer.length, presets.BROADCAST_PORT, presets.BROADCAST_HOST, function(err, bytes) {
                CONSOLE_LOG('UDP messageID: ' + messageContent.id + ' ' + messageType + ' sent to ' + presets.BROADCAST_HOST + ':' + presets.BROADCAST_PORT, 4)
              })
              /*await client.send(tempBuffer, 0, tempBuffer.length, presets.BROADCAST_PORT, presets.BROADCAST_HOST, function(err, bytes) {
                CONSOLE_LOG('UDP messageID: ' + messageContent.id + ' ' + messageType + ' sent to ' + presets.BROADCAST_HOST + ':' + presets.BROADCAST_PORT, 4)
              })*/

              messagePartId++
            } else {
              dropSubPackageInterval = true
            }
          }
          sendSubPackageInterval = setInterval(function(){if(!dropSubPackageInterval){sendSubPackage()} else {clearInterval(sendSubPackageInterval)}}, RESEND_PACKAGE_TIME)
        }
      return true;
    } catch (err) {
      CONSOLE_LOG("UDP SENDING ERROR, " + err, 3)
    }
}

/************************************************************/
/*********************** UDP DISPATCHING *******************/
/**********************************************************/
server.on('message', function(message, remote) {
  message = message.toString()

  //package reassambly
  if(message.charAt(1) == constants.SUBPACKAGE_SPLITSIGN){
    const messageArr = message.split(constants.SUBPACKAGE_SPLITSIGN)
    const messageObj = {
      subPackageLast: messageArr[0],
      subPackageId: messageArr[1],
      packageId: messageArr[2],
      package: messageArr[3]
    }
    if(cache.cache.packagesToReassemble[messageObj.packageId] === undefined)
      cache.cache.packagesToReassemble[messageObj.packageId] = []
    cache.cache.packagesToReassemble[messageObj.packageId][messageObj.subPackageId] = messageObj

    const lastBundleReceivedFlag = 1
    message = constants.EMPTY_STR
    if(cache.cache.packagesToReassemble[messageObj.packageId][cache.cache.packagesToReassemble[messageObj.packageId].length - 1].subPackageLast == lastBundleReceivedFlag
    && cache.cache.packagesToReassemble[messageObj.packageId].filter(d => d).length == cache.cache.packagesToReassemble[messageObj.packageId].length){
        message = cache.cache.packagesToReassemble[messageObj.packageId].reduce((acc, val, idx) => { return acc + val.package }, constants.EMPTY_STR)
    }
  }

  /** if message is correctly reassambled or already in correct format **/
  if(message !== constants.EMPTY_STR){
    let messageJson = JSON.parse(message)
    CONSOLE_LOG("Request: " + messageJson.type, 3)

    /* Forward package along platoon */
    cache.cache.newPackage = false //default false
    if(cache.cache.sendPackages.indexOf(messageJson.id) < 0){
      cache.cache.sendPackages.push(messageJson.id)
      cache.cache.newPackage = true
      //UDPSend(messageJson)
      CONSOLE_LOG("RequestID: " + messageJson.id, 1)
    }

    /* Respond to package dependent on the stage and messageJson.type */
    if((presets.ACCEPT_ALL_BUNDLES || cache.cache.newPackage) && !global.resetOngoing){
      if (messageJson.type == constants.DISCOVERY) {
        respondToDiscovery(messageJson)
      }
      else if (messageJson.type == constants.INIT && !cache.stageFlags.initStage && !cache.stageFlags.initOngoing && cache.stageFlags.discoveryStage) { //TODO what if connection closes? must be periodic handler to check if connection still exists and the unblock cache. Deadlock if discoverystage not closed
        respondToInit(messageJson)
      }
      else if (messageJson.type == constants.INITIAL_DIGESTS && !cache.stageFlags.digestsOngoing && !cache.stageFlags.channelOpen) {
        respondToInitialDigests(messageJson)
      }
      else if (messageJson.type == constants.CHANNEL_OPENING){
        respondToChannelOpening(messageJson)
      }
      else if (messageJson.type == constants.PROPOSAL){
        respondToProposal(messageJson)
      }
      else if (messageJson.type == constants.BUNDLES) {
        respondToBundles(messageJson)
      }
      else if (messageJson.type == constants.DIGESTS) {
        respondToDigests(messageJson)
      }
      else if (messageJson.type == constants.SIGNATURES) {
        respondToSignatures(messageJson)
      }
      else if (messageJson.type == constants.INCREASE_REQUEST){
        respondToIncreaseRequest(messageJson)
      }
      else if (messageJson.type == constants.RESEND_REQUEST){
        respondToResendRequest(messageJson)
      }
    }
  }
})

/********************************************************************/
/*********************** UDP RESPONSE FUNCTIONS ********************/
/******************************************************************/
/*************************************************************************************/
/******PARTICIPANT DISCOVERY (CALLED BY USER AND OTHERS. AND ONLY INITIALLY)******/
/***********************************************************************************/
function respondToDiscovery(messageJson){
  //check if purpose is the same , depositMin is reached and payment and frequency are the same
  if (cache.config.channel.purpose == messageJson.payload.config.channel.purpose
    && cache.config.channel.depositMin <= messageJson.payload.config.channel.depositOwn
    && cache.config.channel.payment.matrix.length == cache.config.channel.payment.matrix.length //TODO check arrays channel.payment.matrix == channel.payment.matrix
    && cache.config.channel.payment.frequency == messageJson.payload.config.channel.payment.frequency
    && (cache.cache.participants.length == 0 || cache.cache.participants.findIndex(participant => participant.channel.vin == messageJson.payload.config.channel.vin) < 0)) {
      cache.cache.participants.push(messageJson.payload.config)
    }
  //if all users submitted
  if ((cache.cache.participants.length == cache.config.channel.minUsers) && (cache.cache.participants.length == cache.config.channel.payment.matrix.length) || DEBUG) { //TODO check if quadratic matrix
    cache.cache.participants.sort(function(a, b) {
      return parseInt(a.channel.vin) - parseInt(b.channel.vin);
    })
    //set all config parameters to the highest one requested by any users
    //and set userIndex based on vin order
    let userIndexCounter = -1
    cache.cache.participants = cache.cache.participants.map(participant => {
      cache.config.flashConfig.security = (cache.config.flashConfig.security < participant.flashConfig.security) ? participant.flashConfig.security : cache.config.flashConfig.security
      cache.config.flashConfig.treeDepth = (cache.config.flashConfig.treeDepth < participant.flashConfig.treeDepth) ? participant.flashConfig.treeDepth : cache.config.flashConfig.treeDepth
      cache.config.flashConfig.signersCount = (cache.config.flashConfig.signersCount < participant.flashConfig.signersCount) ? participant.flashConfig.signersCount : cache.config.flashConfig.signersCount
      userIndexCounter++
      participant.channel.userIndex = userIndexCounter
      return participant
    })
    cache.stageFlags.discoveryStage = true
    CONSOLE_TIME("DISCOVERY_END:"+Date.now())

  }
}

/****************************************************************/
/*****INIT (CALLED BY USER AND OTHERS. AND ONLY INITIALLY)******/
/**************************************************************/
function respondToInit(messageJson){
  let tempUserIndexCounter = 0
  //build userMatrixMapping according to given vin order
  cache.cache.userMatrixMapping = messageJson.payload.initMapping.map(vin => {
    let participantObj = cache.cache.participants.find(participant => {
      return (participant.channel.vin == vin)
    })
    //set own userIndex
    if(participantObj.channel.vin == cache.config.channel.vin) {
      cache.config.channel.userIndex = participantObj.channel.userIndex
    }
    tempUserIndexCounter++
    return {userIndex: participantObj.channel.userIndex, vin: participantObj.channel.vin}
  })
  iota.setUserIndex(cache.config.channel.userIndex) //TODO just temporary define the userIndex in the iota bundle just to pick the correct seed from presets
  cache.cache.settlementAddressesWithIndex = [{
    userIndex: cache.config.channel.userIndex,
    settlementAddress: cache.config.userSettlementAddress
  }]
  cache.stageFlags.initOngoing = true

  /*DIGESTS*/
  //open flashChannel and return as many digests as predefined
  //derive digests necessary to be created before payment round 0
  cache.cache.digestsAmountForNextRounds = cache.calculateDigestsAmountForNextRounds(cache.config.flashConfig.treeDepth)
  let digestsAmountForInitRound = (cache.config.channel.sendDigestsWithBundle) ? Math.max(cache.config.channel.digestsPreTreeSize, cache.deriveNumberOfDigestsToCreate(constants.INIT_TREE_INDEX - 1)) : helpers.returnNumTreeNodes(cache.config.flashConfig.treeDepth)
  digests = cache.userOne.init(cache.config.channel.userIndex, presets.SEED, presets.DEPOSITS, cache.config.flashConfig, digestsAmountForInitRound, cache.config.channel.sendDigestsWithBundle).partialDigests
  CONSOLE_TIME("INIT_DIGESTS_GENERATED_END:"+Date.now())

  //send created digests and address from Tangle
  function sendDigestsAndSettlementAddress(){
    CONSOLE_TIME("I_GET_ADDRESS_START:"+Date.now())

    //retrieve address from Tangle
    iota.initProcess((settlementAddress, fromInput) => {
      CONSOLE_TIME("I_GET_ADDRESS_END:"+Date.now())
      CONSOLE_LOG("IOTA ADDRESS RECEIVED", 3)
      if(settlementAddress !== null && fromInput !== null){
        //update settlementAddress of this user
       cache.cache.settlementAddressesWithIndex = cache.cache.settlementAddressesWithIndex.map(s => {
         if(s.userIndex == cache.config.channel.userIndex){
           s.settlementAddress = settlementAddress
         }
         return s
       })
       cache.userOne.updateSettlementAddresses(cache.cache.settlementAddressesWithIndex)
       cache.cache.fromInput = fromInput

       //send digests without delay if amount is small
       if(!DEBUG_MANY_DIGESTS){
         for(let i = 0;i < digests.length;i++){
           let udpMessage = {
            type: constants.INITIAL_DIGESTS,
            id: helpers.guid(),
            payload: {
              userIndex: cache.userOne.returnUserIndex(),
              digest: digests[i],
              settlementAddress: {
                userIndex: cache.userOne.returnUserIndex(),
                settlementAddress: settlementAddress
              }
            }
           }
           UDPSend(udpMessage)
          }
        } else {
          //send digests with delay for large amount of digests to avoid buffer overflow
          function sendDigest(i){
            let udpMessage = {
             type: constants.INITIAL_DIGESTS,
             id: helpers.guid(),
             payload: {
               userIndex: cache.userOne.returnUserIndex(),
               digest: digests[i],
               settlementAddress: {
                 userIndex: cache.userOne.returnUserIndex(),
                 settlementAddress: settlementAddress
               }
             }
            }
            UDPSend(udpMessage)
          }
          let digestsMax = digests.length
          let i = 0
          let waitForDigestsSend = setInterval(() => {
            if(i < digestsMax){
              sendDigest(i)
              i++
            } else {
              clearInterval(waitForDigestsSend)
            }
          }, MANY_DIGESTS_SEND_INTERVAL)
        }
        cache.stageFlags.initStage = true
      } else {
        CONSOLE_LOG("IOTA TESTNET CONNECTION FAILED", 3)
      }
    })
  }

  //send created digests and fake address
  function sendDigestsAndSettlementAddressOffline(){
    for(let i = 0;i < digests.length;i++){
      let udpMessage = {
        type: constants.INITIAL_DIGESTS,
        id: helpers.guid(),
        payload: {
          userIndex: cache.userOne.returnUserIndex(),
          digest: digests[i],
          settlementAddress: {
            userIndex: cache.userOne.returnUserIndex(),
            settlementAddress: cache.config.userSettlementAddress
          }
        }
      }
      UDPSend(udpMessage)
    }
    cache.stageFlags.initStage = true
  }

  if(DEBUG_OFFLINE){
    sendDigestsAndSettlementAddressOffline()
  } else {
    sendDigestsAndSettlementAddress()
  }
  CONSOLE_TIME("INIT_END:"+Date.now())
}

/***************************************************************************/
/*****INITIAL DIGESTS (CALLED BY USER AND OTHERS. AND ONLY INITIALLY)******/
/*************************************************************************/
function respondToInitialDigests(messageJson){

  if(cache.cache.partnerDigests[messageJson.payload.userIndex] === undefined)
    cache.cache.partnerDigests[messageJson.payload.userIndex] = []

  //add digest for new party in respective position in digest array
  let digestAssigned = false
  if(helpers.flat(cache.cache.partnerDigests[messageJson.payload.userIndex]).findIndex(d => d.digest == messageJson.payload.digest.digest) < 0){
    cache.cache.digestsAmountForNextRounds.forEach((digestsForRounds, i) => {
      if(!digestAssigned){
        if(cache.cache.partnerDigests[messageJson.payload.userIndex][i] === undefined)
          cache.cache.partnerDigests[messageJson.payload.userIndex][i] = []
        if(cache.cache.partnerDigests[messageJson.payload.userIndex][i].length < digestsForRounds){
          cache.cache.partnerDigests[messageJson.payload.userIndex][i].push(messageJson.payload.digest)
          digestAssigned = true
        }
      }
    })
  }

  //check if user's settlementAddress was already added
  let newSettlementAddress = messageJson.payload.settlementAddress
  if(cache.cache.settlementAddressesWithIndex.findIndex(settlementAddressObj => settlementAddressObj.userIndex == newSettlementAddress.userIndex) < 0)
    cache.cache.settlementAddressesWithIndex = cache.cache.settlementAddressesWithIndex.concat([newSettlementAddress])

  //check how many digests are required for the first payment round
  let digestsAmountForInitRound
  if(!cache.config.channel.sendDigestsWithBundle){
    digestsAmountForInitRound = helpers.returnNumTreeNodes(cache.config.flashConfig.treeDepth)
  } else {
    digestsAmountForInitRound = Math.max(cache.config.channel.digestsPreTreeSize, cache.deriveNumberOfDigestsToCreate(constants.INIT_TREE_INDEX - 1))
  }
  let partnersDigestsComplete = cache.cache.partnerDigests.filter(userDigests => helpers.flat(userDigests).filter(d=>d).length == digestsAmountForInitRound)

  /*Check if all users have submitted their digests and settlementAddresses*/
  if (partnersDigestsComplete.length == cache.config.flashConfig.signersCount) {
    //sort digests by digests index for each user and prepare digests object
    let partnersDigestsObjWithIndex = cache.cache.partnerDigests.map((userDigests, i) => {
      const digestObj = {
        userIndex: i,
        partialDigests: userDigests[constants.INIT_TREE_INDEX].sort(function(a, b) { //only build tree with digests for first bundle (not all created digests)
         return parseInt(a.index) - parseInt(b.index);
        })
      }
      return digestObj
    })
    cache.stageFlags.digestsOngoing = true

    //create initial address tree and assign settlementAddresses
    CONSOLE_LOG("partnersDigestsObjWithIndex", 3)
    CONSOLE_LOG(partnersDigestsObjWithIndex, 3)
    cache.stageFlags.digestsStage = cache.userOne.compose(partnersDigestsObjWithIndex, cache.cache.settlementAddressesWithIndex)
    /**IOTA commit to deposit from user**/
    let depositAddress = cache.userOne.returnDepositAddress()
    //next step will check if all users payed the deposit
    let value = cache.config.deposits[cache.config.channel.userIndex]

     /****FUNDING of ADDRESS****/
    CONSOLE_LOG("FUNDING PROCESS STARTED to: " + depositAddress, 3)
    function fundAddressFake(){
      let udpMessage = {
        type: constants.CHANNEL_OPENING,
        id: helpers.guid(),
        payload: {
          userIndex: cache.userOne.returnUserIndex()
        }
      }
      UDPSend(udpMessage)
    }
    function fundAddress(){
      let fundingFinished = false
      CONSOLE_TIME("I_FUND_ADDRESS_START:"+Date.now())
      iota.fundAddress(depositAddress, value, cache.cache.fromInput, cache.userOne.returnUserSettlementAddress(), (success) => {
        CONSOLE_TIME("I_FUND_ADDRESS_END:"+Date.now())
        CONSOLE_TIME("I_CHECK_ADDRESS_START:"+Date.now())
        CONSOLE_LOG("FUNDING FINISHED", 3)
        fundingFinished = success
      })

      CONSOLE_LOG("CHECKING FUNDING PROCESS STARTED", 3)
      var iotaWaitIntervalId
      const checkIfConfirmed = false
      const timeSpendWaitingForInterval = TIME_WAITING_FOR_IOTA_TX
      var timeSpendWaitingForIotaCommit = 0

      function checkAddressBalance() {
        CONSOLE_LOG("timeSpendWaitingForIotaCommit"+timeSpendWaitingForIotaCommit+", response: " + new Date(), 3)
        iota.checkAddressBalance(depositAddress, cache.cache.settlementAddressesWithIndex, cache.config.deposits, checkIfConfirmed, (fundsValid) => {
          //Send channel_opening message that funds were checked successfully and the channel can begin
          if(fundsValid){
            CONSOLE_TIME("I_CHECK_ADDRESS_END:"+Date.now())
            clearInterval(iotaWaitIntervalId)
            let udpMessage = {
              type: constants.CHANNEL_OPENING,
              id: helpers.guid(),
              payload: {
                userIndex: cache.userOne.returnUserIndex()
              }
            }
            UDPSend(udpMessage)
          }

          CONSOLE_LOG("timeSpendWaitingForIotaCommit"+timeSpendWaitingForIotaCommit+", call: " + new Date(), 3)
        })

        if(timeSpendWaitingForIotaCommit >= presets.MAX_WAIT_IOTA_COMMIT)
          clearInterval(iotaWaitIntervalId)
        timeSpendWaitingForIotaCommit+=timeSpendWaitingForInterval
      }
      checkAddressBalance()
      iotaWaitIntervalId = setInterval(() => {if(!cache.stageFlags.channelOpen){checkAddressBalance()} else{clearInterval(iotaWaitIntervalId);CONSOLE_TIME("INITIAL_DIGEST_END:"+Date.now())}}, timeSpendWaitingForInterval) //TODO try with this off
    }

    if(DEBUG_OFFLINE){
      fundAddressFake()
    } else { //fund deposit address online
      fundAddress()
    }
  }
}

/***************************************************************************/
/*****CHANNEL_OPENING (CALLED BY USER AND OTHERS. AND ONLY INITIALLY)******/
/*************************************************************************/
function respondToChannelOpening(messageJson){
  if(cache.cache.receivedChannelOpenings.findIndex(i => i == messageJson.payload.userIndex) < 0) {
    cache.cache.receivedChannelOpenings.push(messageJson.payload.userIndex)
  }
  //Synchronize channel openings when all parties have checked the funds
  if(cache.cache.receivedChannelOpenings.length == cache.cache.userMatrixMapping.length){
    cache.stageFlags.channelOpen = true
    CONSOLE_TIME("CHANNEL_OPEN_END:"+Date.now())
    CONSOLE_TIME("------------Channel Is Open (Deposit to: "+ cache.userOne.returnDepositAddress() +" )")

  }
}

function respondToProposal(messageJson){
  //TODO resend scenario
  if(!cache.checkProposalPlausibility(messageJson.payload)){
    /* Request increased proposal of this proposal */
    sendProposalIncreaseRequest(messageJson.payload)
  } else {
    if(cache.cache.proposals[messageJson.payload.paymentId] === undefined){
      cache.cache.proposals[messageJson.payload.paymentId] = []
      cache.cache.proposalsIds[messageJson.payload.paymentId] = []
    }

    cache.cache.proposals[messageJson.payload.paymentId][messageJson.payload.proposalOwner] = messageJson.payload.proposal
    cache.cache.proposalsIds[messageJson.payload.paymentId][messageJson.payload.proposalOwner] = messageJson.id

    //if proposals from all users arrived
    //calculate delta to be transferred to each user
    let receivedProposals = cache.cache.proposals[messageJson.payload.paymentId].filter(proposal => proposal !== undefined && proposal.length > 0)
    if(receivedProposals !== undefined && receivedProposals.length == cache.config.deposits.length){
      let transferMessage = cache.cache.proposals[messageJson.payload.paymentId].map((proposal, i) => {
        return {
            value: 0,
            address: cache.cache.settlementAddressesWithIndex.find(s => s.userIndex == i).settlementAddress
          }
      })
      cache.cache.proposals[messageJson.payload.paymentId].forEach(proposal => {
        proposal.forEach(singleProposal => {
          if(singleProposal.address !== undefined && singleProposal.address !== constants.EMPTY_STR){
            transferMessage[cache.cache.settlementAddressesWithIndex.find(s => s.settlementAddress == singleProposal.address).userIndex].value += singleProposal.value
            //TODO sorted=
            transferMessage[singleProposal.fromIndex].value -= singleProposal.value
          }
        })
      })
      CONSOLE_LOG("respondToProposals: transfer payment", 3)
      CONSOLE_LOG(transferMessage, 3)

      //calculate deterministically who is going to create bundle and send it using helpers.hashCode(transfermessage || package id)
      let transferMessageHash = helpers.hashCode(transferMessage.toString() + cache.cache.proposalsIds[messageJson.payload.paymentId].join("").toString())
      let transferMessageHashStr = transferMessageHash.toString()
      let minimalHash = transferMessageHashStr.substring(transferMessageHashStr.length-cache.config.deposits.length.toString().length,transferMessageHashStr.length)
      let hashToPartition = 10
      for(let i = 1;i<cache.config.deposits.length.toString().length;i++){
        hashToPartition *= 10
      }
      let parts = hashToPartition / cache.config.deposits.length //100 / 40 participants = 2.5
      let paymentOwnerId = minimalHash / ((parts == 0) ? 1 : parts) //68/2.5 = 27 = bundleOwnerId
      if(Math.floor(paymentOwnerId) == cache.userOne.returnUserIndex()){
        //TODO comment constants.PROPOSALS_RESEND
        sendBundles(transferMessage, constants.PROPOSAL_RESEND, constants.INITIATOR) //derive and send bundles to users
      } else {
        sendBundles(transferMessage, constants.PROPOSAL_RESEND, !constants.INITIATOR) //derive bundles (for later checks)
      }
      CONSOLE_TIME("PAYMENT_SEND_END:"+Date.now())
    }
  }
}

/***********************************************/
/*****BUNDLES (CALLED BY USER AND OTHERS)******/
/*********************************************/
function respondToBundles(messageJson){
  //check if bundle was already transacted
  CONSOLE_LOG("Arrived package with paymentId: " + messageJson.payload.paymentId, 3)
  const bundleTransacted = (cache.cache.storedBundles.filter((payment) => {
     return (payment !== undefined && messageJson.payload.paymentId == payment.paymentId)
   }).filter(payment => payment.paymentStatus == constants.TRANSACTED).length > 0)

  CONSOLE_LOG("cache.cache.bundleProcessingInProgress", 3)
  CONSOLE_LOG(cache.cache.bundleProcessingInProgress, 3)
  CONSOLE_LOG("messageJson.payload", 3)
  CONSOLE_LOG(messageJson.payload, 3)
  if(!bundleTransacted && ((cache.cache.bundleProcessingInProgress != messageJson.payload.paymentId) || cache.isClosingBundle(messageJson.payload.payment, messageJson.payload))) {

    //update number for paymentId for serializing payments
    cache.cache.paymentNumber = Math.max(cache.cache.paymentNumber, messageJson.payload.paymentId+1)
    cache.cache.paymentRound = Math.max(cache.cache.paymentRound, cache.cache.paymentNumber)
    CONSOLE_LOG("cache.cache.paymentRound UP", 3)
    CONSOLE_LOG(cache.cache.paymentRound, 3)
    CONSOLE_LOG("cache.cache.paymentNumber UP", 3)
    CONSOLE_LOG(cache.cache.paymentNumber, 3)

    //creating a dense array
    let paymentIndex = cache.cache.receivedBundleIds.indexOf(messageJson.payload.paymentId)
    if (paymentIndex < 0) {
      cache.cache.receivedBundleIds.push(messageJson.payload.paymentId)
      paymentIndex = cache.cache.receivedBundleIds.length - 1
      cache.cache.lastBundles[paymentIndex] = []
    }
    if (cache.cache.lastBundles[paymentIndex][messageJson.payload.bundlesCurrentIndex] === undefined)
      cache.cache.lastBundles[paymentIndex][messageJson.payload.bundlesCurrentIndex] = []
    cache.cache.lastBundles[paymentIndex][messageJson.payload.bundlesCurrentIndex][messageJson.payload.subBundlesCurrentIndex] = messageJson.payload.bundles

    let receivedBundles = []
    let receivedBundlesSupposedLength = []
    let receivedBundlesCount = cache.cache.lastBundles[paymentIndex].filter(bundle => bundle !== undefined).filter(bundle => {
      let nonEmptyBundles = bundle.filter(subBundle => subBundle !== undefined)
      return (nonEmptyBundles.length == (nonEmptyBundles[0].lastIndex + 1))
    }).length
    let paymentBundleCount = messageJson.payload.bundlesLastIndex
    CONSOLE_LOG("receivedBundlesCount: " + receivedBundlesCount, 3)

    /**PROCESS if payment including all bundles is now complete**/
    if (paymentBundleCount == receivedBundlesCount) {
      //no need for reject transaction explicitly. can simply wait for correct one to arrive later on
      if(cache.checkPaymentValidity(cache.cache.lastBundles[paymentIndex], messageJson.payload)){
        cache.cache.bundleProcessingInProgress = messageJson.payload.paymentId
        //TODO check if allfirst bundle was transacted successfully
        /*check if bundle was really issued by user in case this user is owner**/
        let ownerApproval = true
        if(messageJson.payload.paymentOwner == cache.userOne.returnUserIndex())
          ownerApproval = false
        if(cache.cache.initiatedBundles.findIndex(initiatedPayment => {return (cache.cache.receivedBundleIds[paymentIndex] == initiatedPayment.paymentId)}) >= 0)
          ownerApproval = true
        if(ownerApproval){
          /*SEND signatures fo current bundle*/
          CONSOLE_LOG("Generate Signatures", 3)
          let userSignatures = cache.userOne.getSignatures(cache.cache.lastBundles[paymentIndex])
          for (let i = userSignatures.length - 1; i >= 0; i--) {
            let udpMessage = {
              type: constants.SIGNATURES,
              id: helpers.guid(),
              payload: {
                paymentId: messageJson.payload.paymentId,
                paymentIsClosingBundle: messageJson.payload.paymentIsClosingBundle,
                userIndex: cache.userOne.returnUserIndex(),
                bundlesCurrentIndex: i,
                bundlesLastIndex: userSignatures.length,
                userSignatures: userSignatures[i]
              }
            }
            UDPSend(udpMessage)

          }
          CONSOLE_TIME("SIGNATURES_SEND_END:"+Date.now())

          /*SEND Digests for entire next paymentRound*/
          if(cache.config.channel.sendDigestsWithBundle && !cache.isClosingBundle(cache.cache.lastBundles[paymentIndex], messageJson.payload)) {
            let digests = []
            //calculate how many digests to create for next payment round
            let digestAmountToGenerate = (cache.checkDigestsCompleteness(messageJson.payload.paymentId)) ? 0 : cache.deriveNumberOfDigestsToCreate(messageJson.payload.paymentId)
            CONSOLE_LOG("digestAmountToGenerate", 3)
            CONSOLE_LOG(digestAmountToGenerate, 3)
            let newDigestsRequired = digestAmountToGenerate > 0
            //if cache.cache.storedBundles[messageJson.payload.paymentId] will get filled because of successful appication of previous bundle received.
            let resendScenario = (cache.cache.storedBundles[messageJson.payload.paymentId] !== undefined) //this will happen in the following for sure, so that is able to detect resend for digests appropriately
            //in a resend scenario do not regenerate digest; instead return existing digests for respective payment
            if(resendScenario){
              //in case of resend understand why so many digests are resend in current test
              digests = digests.concat(cache.cache.partnerDigests[cache.userOne.returnUserIndex()][messageJson.payload.paymentId + 1]) //resend digests needed for next payment
              //get all digests of this payment round
              CONSOLE_LOG("resendScenario",3)
              CONSOLE_LOG(digests, 3)
            } else if(newDigestsRequired) {
              //TODO Only send digests in first bundles of paymentRound
              digests = cache.userOne.generateDigests(digestAmountToGenerate).partialDigests
              //add own digests immediately; no check for pre existence necessary because this is the first point where new digests are added
            } else if(!resendScenario && !newDigestsRequired) {
              //insert empty array where no new digests are required
              cache.cache.partnerDigests = cache.cache.partnerDigests.map(userDigests => {
                userDigests[messageJson.payload.paymentId + 1] = (userDigests[messageJson.payload.paymentId + 1] !== undefined) ? userDigests[messageJson.payload.paymentId + 1] : []
                return userDigests
              })
            }
            for(let i = 0;i < digests.length;i++){
              let udpMessage = {
                type: constants.DIGESTS,
                id: helpers.guid(),
                payload: {
                  userIndex: cache.userOne.returnUserIndex(),
                  paymentId: messageJson.payload.paymentId,
                  digest: digests[i],
                }
              }
              UDPSend(udpMessage)

            }
            //TODO check if old paymentNumber is still valid to not increase because of message forwarding
            if(cache.cache.newPackage && !resendScenario){
              CONSOLE_LOG("Sending Further Digests", 3)
              CONSOLE_LOG(digests, 3)
            }
          }

          /*PERSIST current bundles for further processing*/
          //only persist new bundles that arent stored already and put bundles in payment format
          let lastBundlesToPersist
          if(cache.cache.lastBundles[paymentIndex] !== undefined && (cache.cache.storedBundles[messageJson.payload.paymentId] === undefined || cache.cache.storedBundles[messageJson.payload.paymentId].paymentStatus !== constants.TRANSACTED)){ //TODO this was false because overwriting needs to be enabled && cache.cache.storedBundles[messageJson.payload.paymentId] === undefined
            lastBundlesToPersist = {
              paymentOwner: messageJson.payload.paymentOwner,
              paymentId: messageJson.payload.paymentId,
              paymentTimestamp: messageJson.payload.paymentTimestamp, //paymentTimestmap not required
              paymentIsClosingBundle: messageJson.payload.paymentIsClosingBundle,
              paymentStatus: constants.EMPTY_STR,
              payment: cache.cache.lastBundles[paymentIndex]
            }
          }
          if(lastBundlesToPersist !== undefined){
            cache.cache.storedBundles[messageJson.payload.paymentId] = arrHelpers.deepClone(lastBundlesToPersist)
          }
          /* cut out finished bundles **/
          cache.cache.receivedBundleIds.splice(paymentIndex, paymentIndex + 1)
          cache.cache.lastBundles.splice(paymentIndex, paymentIndex + 1)

          if (!cache.stageFlags.bundleStage) {
            cache.stageFlags.bundleStage = true
          }
          CONSOLE_TIME("DIGESTS_SEND_END:"+Date.now())
        }
      }
    }
  }
}

/****************************************************/
/********DIGESTS (CALLED BY USER AND OTHERS)********/
/**************************************************/
//ONLY CALLED WHEN cache.config.channel.sendDigestsWithBundle = true
function respondToDigests(messageJson){
  //add new digests for a participant
  if(cache.cache.partnerDigests[messageJson.payload.userIndex][messageJson.payload.paymentId] === undefined)
    cache.cache.partnerDigests[messageJson.payload.userIndex][messageJson.payload.paymentId] = []

  CONSOLE_LOG("Digest arrived for paymentId: " + messageJson.payload.paymentId, 3)
  //add digest for new party in respective position in digest array
  let digestAssigned = false
  if(helpers.flat(cache.cache.partnerDigests[messageJson.payload.userIndex]).findIndex(d => d.digest == messageJson.payload.digest.digest) < 0){
    cache.cache.digestsAmountForNextRounds.forEach((digestsForRounds, i) => {
      if(!digestAssigned){
        if(cache.cache.partnerDigests[messageJson.payload.userIndex][i] === undefined)
          cache.cache.partnerDigests[messageJson.payload.userIndex][i] = []
        if(cache.cache.partnerDigests[messageJson.payload.userIndex][i].length < digestsForRounds){
          cache.cache.partnerDigests[messageJson.payload.userIndex][i].push(messageJson.payload.digest)
          digestAssigned = true
        }
      }
    })
  }
  let sigaturesComplete = (cache.cache.storedBundles[messageJson.payload.paymentId] !== undefined && cache.cache.storedBundles[messageJson.payload.paymentId].paymentStatus == constants.SIGNED)
  if(sigaturesComplete && (cache.checkDigestsCompleteness(messageJson.payload.paymentId) && (cache.cache.bundlesTransactedCount < messageJson.payload.paymentId + 1))){
    CONSOLE_TIME("DIGESTS_RECEIVED_END:"+Date.now())

    CONSOLE_LOG("processTransaction from DIGESTS", 3)
    processTransactions()
  }
}

/****************************************************/
/******SIGNATURES (CALLED BY USER AND OTHERS)*******/
/**************************************************/
function respondToSignatures(messageJson){
    try {
      /**Proceed with signing and transacting the bundle only if it wasn't transacted yet by user AND if the previous bundleId was already transacted**/
      //check if bundle was already transacted
      const cachedBundleTransacted = /*TODO Kill: New Scheme doesnt requires checking*/ false && (cache.cache.storedBundles.filter((payment) => {
         return (payment !== undefined && (messageJson.payload.paymentId == payment.paymentId))
       }).filter(payment => payment.paymentStatus == constants.TRANSACTED).length > 0)
      if(!cachedBundleTransacted) {
        /**Push bundle to cache.cache.lastSignatures and create index on new array**/
        //creating a dense array
        let receivedSignaturesLocalIndex = cache.cache.receivedSignatureBundleIds.indexOf(messageJson.payload.paymentId)
        if (receivedSignaturesLocalIndex < 0) {
          cache.cache.receivedSignatureBundleIds.push(messageJson.payload.paymentId)
          receivedSignaturesLocalIndex = cache.cache.receivedSignatureBundleIds.length - 1
          cache.cache.lastSignatures[receivedSignaturesLocalIndex] = []
        }

        /**Assign userSignature to cache.cache.lastSignatures. Having bundlexCurrentIndex as index guarantees correct order**/
        if (cache.cache.lastSignatures[receivedSignaturesLocalIndex][messageJson.payload.bundlesCurrentIndex] == undefined)
          cache.cache.lastSignatures[receivedSignaturesLocalIndex][messageJson.payload.bundlesCurrentIndex] = []
        cache.cache.lastSignatures[receivedSignaturesLocalIndex][messageJson.payload.bundlesCurrentIndex][messageJson.payload.userIndex] = messageJson.payload.userSignatures

        /**Check which users have submitted the signature already. This is a new structure: payment, bundle, userIndex = userSignature*/
        let receivedSignatures = 0
        let allUsersSignatures = []
        cache.cache.lastSignatures[receivedSignaturesLocalIndex].forEach((bundle, bundleI) => {
          let receivedSignaturesByUsers = 0
          bundle.forEach((user, userI) => {
            if (user.signatureFragments !== undefined) {
              if (allUsersSignatures[userI] === undefined)
                allUsersSignatures[userI] = []
              allUsersSignatures[userI][bundleI] = user
              receivedSignaturesByUsers++
            }
          })
          if (receivedSignaturesByUsers == cache.config.flashConfig.signersCount) {
            receivedSignatures++
          }
        })

        /*construct {userIndex, signature} object */
        let userSignaturesWithIndex = allUsersSignatures.map((signatureFragments, userI) => {
          return {
            userIndex: userI,
            signatures: signatureFragments
          }
        })

        CONSOLE_LOG("userSignaturesWithIndex", 3)
        CONSOLE_LOG(userSignaturesWithIndex, 3)
        CONSOLE_LOG("messageJson.payload.bundlesLastIndex", 3)
        CONSOLE_LOG(messageJson.payload.bundlesLastIndex, 3)
        CONSOLE_LOG("receivedSignatures", 3)
        CONSOLE_LOG(receivedSignatures, 3)

        /**Check if all users have signed and all bundles have arrived or a 0 bundle was submitted**/
        //TODO not sure if cache.cache.storedBundles[messageJson.payload.paymentId].payment works if bundle is empty
        if (receivedSignatures == messageJson.payload.bundlesLastIndex) {
          /**Sign bundles out all bundles in payment. Cut out happends to cache.cache.lastSignatures and cache.cache.receivedSignatureBundleIds. e**/
          let signedBundles
          signedBundles = cache.userOne.sign(cache.cache.storedBundles[messageJson.payload.paymentId].payment, userSignaturesWithIndex)
          let oldPaymentStatus = cache.cache.storedBundles[messageJson.payload.paymentId].paymentStatus
          cache.cache.storedBundles[messageJson.payload.paymentId].paymentStatus = (oldPaymentStatus == constants.TRANSACTED) ? constants.TRANSACTED : constants.SIGNED //TODO resend signatures when this is detected, because it representes a resend
          if(signedBundles === undefined){
            CONSOLE_LOG("SIGNED BUNDLES UNDEFINED", 3)
          }
          cache.cache.storedBundles[messageJson.payload.paymentId].payment = arrHelpers.deepClone(signedBundles)
          CONSOLE_LOG("SIGNING BUNDLE DONE: " + cache.cache.storedBundles[messageJson.payload.paymentId].paymentStatus + ", ID: " + messageJson.payload.paymentId, 3)
          CONSOLE_LOG(cache.cache.storedBundles[messageJson.payload.paymentId].payment, 0)
          CONSOLE_LOG(signedBundles, 0)
          cache.cache.receivedSignatureBundleIds.splice(receivedSignaturesLocalIndex, receivedSignaturesLocalIndex + 1)
          cache.cache.lastSignatures.splice(receivedSignaturesLocalIndex, receivedSignaturesLocalIndex + 1)
          //make transactprocessing here if digests were already received
          let bundleResent = (cache.cache.bundlesTransactedCount < messageJson.payload.paymentId + 1)
          if((!cache.config.channel.sendDigestsWithBundle || cache.isClosingBundle(messageJson.payload.payment, messageJson.payload) || (cache.checkDigestsCompleteness(messageJson.payload.paymentId)) && bundleResent)){
            CONSOLE_TIME("SIGNATURES_APPLIED_END:"+Date.now())
            CONSOLE_LOG("processTransaction from SIGNATURES", 3)
            processTransactions()
          }
        }
      }
    } catch(e) { //TODO change positions
    if(!global.resetOngoing){
      CONSOLE_LOG("Signature Error: " + e, 4)
      throw e;
    } else {
    CONSOLE_LOG("Incoming transaction during reset catched", 3)
    }
  }
}

function respondToIncreaseRequest(messageJson){
  //TODO must become smarted adn directly react to instructions of requester
  if(cache.cache.proposalIncreaseRequests.findIndex(request => request == messageJson.id < 0)){
    cache.cache.proposalIncreaseRequests.push(messageJson.id)
    let userIsOwner = (messageJson.payload.proposalOwner == cache.userOne.returnUserIndex())
    if(userIsOwner) {
      CONSOLE_LOG("respondToIncreaseRequest arraysEqual: true", 3)
      //TODO increase payments theoretically
      let transferMessage = cache.derivePaymentsFromPaymentMatrix(cache.userOne.returnUserIndex())
      CONSOLE_LOG("Transfer created (increased): ", 3)
      CONSOLE_LOG(transferMessage, 3)
      sendProposal(transferMessage, cache.cache.paymentNumber)
    } else {
      CONSOLE_LOG("respondToIncreaseRequest arraysEqual: false. or something else", 3)
    }
  }
}

function respondToResendRequest(messageJson){
  CONSOLE_LOG("respondToResendRequest", 3)
  let userIsBundleOwner = (cache.lastOngoingPayment() === undefined) ? false : (messageJson.payload.requestedId == cache.lastOngoingPayment().paymentId)
  if(cache.cache.resendActivities == 0 && messageJson.payload.requestedContent === constants.PROPOSAL){
    cache.cache.bundleProcessingInProgress = -1
    CONSOLE_LOG(cache.cache.proposals, 3)
    CONSOLE_LOG(messageJson.payload.requestedId, 3)
    CONSOLE_LOG(cache.cache.proposals[messageJson.payload.requestedId][cache.userOne.returnUserIndex()], 3)
    let transferMessage = cache.cache.proposals[messageJson.payload.requestedId][cache.userOne.returnUserIndex()] //important to react to the users requested proposal id and not to the last proposal issued by this user!
    sendProposal(transferMessage, messageJson.payload.requestedId)
  } else if(cache.cache.resendActivities == 0 && userIsBundleOwner && messageJson.payload.requestedContent === constants.BUNDLES) {
    cache.cache.bundleProcessingInProgress = -1
    sendBundles(constants.EMPTY_STR, constants.RESEND, constants.INITIATOR)
  }
  cache.cache.resendActivities++
}

/******************************** FUNCTIONS ************************************/
/***************************************************************/
/********************* EXPORTED FUNCTIONS *********************/
/*************************************************************/
let getStageFlags = () => {return cache.stageFlags}

function sendDiscoveryInfo() {
  let udpMessage = {
    type: constants.DISCOVERY,
    id: helpers.guid(),
    payload: {
      config: cache.config
    }
  }
  UDPSend(udpMessage)

}

function sendInit(message) {
  let udpMessage = {
    type: constants.INIT,
    id: helpers.guid(),
    payload: {
      initMapping: message
    }
  }
  UDPSend(udpMessage)

}

/** BUSINESS LOGIC**/
function sendPayments(){
  //initial start of business logic checker
  if(cache.cache.initTimestamp == 0){
    cache.cache.initTimestamp = Date.now()//offset payments by userPosition
    CONSOLE_LOG(cache.cache.initTimestamp, 1)
  }

  /*Business logic checker. Allways checks after one paying cycle. includes: request for resending and braking channel after two penalties */
  CONSOLE_LOG("sendPaymentChecker", 0)
  //CONSOLE_LOG((Date.now() - cache.stateChannelCheckObject.lastTimestamp), 0)
  CONSOLE_LOG(cache.cache.lastTransactedPaymentNumber, 0)
  CONSOLE_LOG((cache.stateChannelCheckObject.paymentNumberBeforeResend) , 0)

  CONSOLE_LOG("payment checker penalty timer: " + (Date.now() - cache.cache.initTimestamp) / (cache.config.channel.payment.frequency + 100), 3)
  //detect next payment round
  if(((Date.now() - cache.cache.initTimestamp) / (cache.config.channel.payment.frequency + 100)) > (cache.stateChannelCheckObject.paymentNumberBeforeResend + 2)){ //-1 + 2 = 1 //+ 100 to make it more fluent
    CONSOLE_LOG("NEXT ROUND", 3)
    //detect missing progress in payments
    if(cache.cache.lastTransactedPaymentNumber <= cache.stateChannelCheckObject.paymentNumberBeforeResend){
      CONSOLE_LOG("PENALTY: " + cache.stateChannelCheckObject.penalty + "+1", 3)
      if(cache.stateChannelCheckObject.penalty < cache.config.channel.penaltyMax){//TODO change to == 0 TODO check if already in a successfull resendProcess of a bundle, then of course don't restart resend
        CONSOLE_TIME("------Resend")
        CONSOLE_LOG("Resend initiated by penalty", 3)
        sendResendRequest()
      }
      if(cache.stateChannelCheckObject.penalty == cache.config.channel.penaltyMax){ //TODO change to 1
        CONSOLE_TIME("------Break Up Channel");
        CONSOLE_LOG("Break up Channel!!!", 3)
        //Close Bundles
        sendClosingBundle()
        //cache.stageFlags.bundleBlock = true
      }
      cache.stateChannelCheckObject.penalty += 1
    } else {
      cache.stateChannelCheckObject.penalty = 0
    }
    cache.stateChannelCheckObject.paymentNumberBeforeResend++
  }

  /*DEBUG*/
  CONSOLE_LOG("paymentDue" + (Date.now() -  cache.cache.initTimestamp), 3)
  CONSOLE_LOG("lastTransactedPaymentNumber" + cache.cache.lastTransactedPaymentNumber, 3)
  CONSOLE_LOG("Next paymentNumber" + (cache.cache.paymentNumber), 3)
  /*END DEBUG*/

  let paymentDue = (((Date.now() - cache.cache.initTimestamp) / cache.config.channel.payment.frequency) > (cache.cache.paymentRound)) //TODO make dynamic
  let previousBundleSuccesfullyTransacted = (cache.cache.lastTransactedPaymentNumber == cache.cache.paymentNumber-1)
  let previousProposalSend = (cache.cache.lastSendProposalId == cache.cache.paymentNumber-1)
  let closingOngoing = (cache.stateChannelCheckObject.penalty >= cache.config.channel.penaltyMax)
  if(!closingOngoing && paymentDue && (previousProposalSend && (cache.cache.paymentNumber == 0 || previousBundleSuccesfullyTransacted))){ //only works if sequence is never changed
    if(cache.cache.paymentNumber >= PAYMENT_AMOUNT && !cache.cache.finalPaymentForShow){
      CONSOLE_LOG("STOP PLATOONING AFTER 6 PAYMENTS", 3)
      sendClosingBundle()
      cache.cache.finalPaymentForShow = true
    } else {
      //TODO adapt derivePayment if resend because of reject
      let transferMessage = cache.derivePaymentsFromPaymentMatrix(cache.userOne.returnUserIndex())
      CONSOLE_LOG("Transfer created: ", 3)
      CONSOLE_LOG(transferMessage, 3)
      sendProposal(transferMessage, cache.cache.paymentNumber)
      cache.cache.lastSendProposalId++
    }
  }
}

function sendClosingBundle(){
  CONSOLE_TIME("CLOSING_PROPOSALS_SEND_END:"+Date.now());
  CONSOLE_LOG("SEND CLOSING BUNDLE!!!", 3)
  sendBundles(constants.EMPTY_STR, constants.CLOSING_BUNDLES, constants.INITIATOR)
}

/***************************************************************/
/********************* INTERNAL FUNCTIONS *********************/
/*************************************************************/
function sendProposal(transferMessage, paymentId){
  //can be send as one big package because very few content
  let udpMessage = {
    id: helpers.guid(),
    type: constants.PROPOSAL,
    payload: {
      paymentId: paymentId,
      proposal: transferMessage,
      proposalOwner: cache.userOne.returnUserIndex()
    }
  }
  UDPSend(udpMessage)

  CONSOLE_TIME("PROPOSALS_SEND_END:"+Date.now())
}

function sendBundles(message, action, userIsInitiator) {
  CONSOLE_LOG("sendBundles as " + userIsInitiator, 3)
  //TODO check if bundle was already created once buy the participant
  if (cache.stageFlags.digestsStage) {
    try {
      var client = dgram.createSocket('udp4'); // Neuen Socket zum Client aufbauen
      var bundles
      var payment
      if (action == constants.BUNDLES || action == constants.PROPOSAL_RESEND) {
        CONSOLE_LOG(constants.BUNDLES, 3)
        //generate payment number for paymentId
        //change deposit to as if all previous packages arrived and finished
        if(message[0].value > 0){
          let time = Date.now()
          bundles = cache.userOne.prepare(message)
          if(!bundles){
            CONSOLE_LOG("Bundle creation error", 3)
            sendClosingBundle()
          }
          if(action == constants.PROPOSAL_RESEND){
            payment = {
              paymentId: cache.cache.lastTransactedPaymentNumber + 1
            }
          }
        }
        cache.cache.lastDerivedBundles = bundles
      } else if (action == constants.CLOSING_BUNDLES) {
        CONSOLE_LOG(constants.CLOSING_BUNDLES, 3)
        bundles = cache.userOne.prepareClosing()
      } else if (action == constants.RESEND) {
        CONSOLE_LOG(constants.RESEND, 3)
        //resend all self-initiated bundles since the one previous to the last successful one; or the last successful one
        payment = cache.lastOngoingPayment()
        if(payment !== undefined && payment.payment.length > 0){
          bundles = payment.payment
          CONSOLE_LOG("resending bundles", 3)
        }
      }
      if ((bundles !== undefined) && (bundles.length > 0) && (userIsInitiator === constants.INITIATOR)) {
        /**cache bundle for re-sending later if they didn't arrive at the other participants**/
        if(action != constants.RESEND) {
          //only add if has not been resend yet
          cache.cache.initiatedBundles = cache.cache.initiatedBundles.concat({
              paymentOwner: cache.userOne.returnUserIndex(),
              paymentId: cache.cache.paymentNumber,
              paymentTimestamp: Date.now(), //paymentTimestmap not required
              paymentStatus: constants.EMPTY_STR,
              payment: arrHelpers.deepClone(bundles)
            })
        }
        /**cut bundles to send via UDP only one transaction per package**/
        for (let i = bundles.length - 1; i >= 0; i--) {
          for (let ii = bundles[i].length - 1; ii >= 0; ii--) {
            let udpMessage = {
              type: constants.BUNDLES,
              id: helpers.guid(),
              payload: {
                paymentOwner: cache.userOne.returnUserIndex(),
                paymentId: (action == constants.RESEND || action == constants.PROPOSAL_RESEND) ? payment.paymentId : cache.cache.paymentNumber, //send old paymentId when resending or newly generated when its a new bundle
                paymentTimestamp: Date.now(),
                bundleId: bundles[i][ii].bundle, //userIndex who proposed the bundle
                bundlesCurrentIndex: i,
                bundlesLastIndex: bundles.length,
                subBundlesCurrentIndex: ii,
                subBundlesLastIndex: bundles[i].length,
                bundles: bundles[i][ii],
                paymentIsClosingBundle: (action == constants.CLOSING_BUNDLES),
              }
            }
            UDPSend(udpMessage)

          }
        }
      }
    } catch (err) {
      CONSOLE_LOG("Error" + err, 3)
    }
  } else {
    CONSOLE_LOG("Check False", 0)
  }
}

function sendProposalIncreaseRequest(payload){
  let udpMessage = {
        id: helpers.guid(),
        type: constants.INCREASE_REQUEST,
        payload: {
          paymentId: payload.paymentId,
          proposal: payload.proposal,
          proposalOwner: payload.proposalOwner,
          increaseInstructions: {} //it would say which value seems malicious
        }
  }
  UDPSend(udpMessage)
}

function sendResendRequest(){
  if(cache.cache.resendActivities == 0){
    let requestedContent = constants.EMPTY_STR

    /***Resend of proposal ***/
    //if no fraction of the last bundles has arrived at all
    let missingPaymentId = cache.cache.receivedBundleIds[cache.cache.receivedBundleIds.length - 1]
    if(missingPaymentId < cache.cache.proposalNumber){ //TODO change to payment number
      //Resend proposal because communication error happened most likely earlier than in the bundle receipt
      //cache.cache.proposals should always be filled with proposal of this round, even if not succesfully
      let transferMessage = cache.cache.proposals[cache.cache.proposals.length - 1][cache.userOne.returnUserIndex()]
      CONSOLE_LOG("Transfer created (resend): ", 3)
      CONSOLE_LOG(transferMessage, 3)

      sendProposal(transferMessage, missingPaymentId)
      requestedContent = constants.PROPOSAL
    } else {
      /*** Resend of bundles ***/
      /*** Resend of digests occurs as response to bundle receipt ***/
      /*** Resend of signature occurs as response to bundle receipt ***/
      let userIsBundleOwner = (cache.lastOngoingPayment() === undefined) ? false : (cache.cache.lastTransactedPaymentNumber + 1== cache.lastOngoingPayment().paymentId)
      if(userIsBundleOwner){
        //if bundle is initiated by user
        sendBundles(constants.EMPTY_STR, constants.RESEND, constants.INITIATOR)
      } else {
        //if bundle is NOT initiated by user
        //Request other participant to resend their lastInitiatedBundle if bundle is not initiated by user
        //No chain reaction as in previous scheme but should be ok
        requestedContent = constants.BUNDLES
      }
    }

    CONSOLE_LOG("Requested content: " + requestedContent, 3)
    if(requestedContent !== constants.EMPTY_STR){
      let udpMessage = {
          id: helpers.guid(),
          type: constants.RESEND_REQUEST,
          payload: {
            requestedId: cache.cache.lastTransactedPaymentNumber + 1,
            requestedContent: requestedContent
          }
        }
      UDPSend(udpMessage)
    }
  }
  cache.cache.resendActivities++
}

/**Apply Bundles to mutate Flash Object**/
function processTransactions(){
  CONSOLE_TIME("APPLY_PAYMENT_START:"+Date.now())
  /**Transact all bundles which had transacted predecessors in a serialized manner and unload payload from transacted cache.cache.storedBundles*/
  cache.cache.resendActivities = 0 //reset resend activities tracker
  let closingBundleDetected = false
  let firstUndefined = false
  for(let i = 0;i < cache.cache.storedBundles.length; i++){
    let payment = cache.cache.storedBundles[i]
    if((payment === undefined || (payment.paymentStatus !== constants.SIGNED && payment.paymentStatus !== constants.TRANSACTED))){
      CONSOLE_LOG("UNSIGNED payment.paymentId: " + payment.paymentId, 3)
      firstUndefined = true
    } else if((payment.paymentStatus == constants.SIGNED) && (!firstUndefined || cache.isClosingBundle(payment.payment, payment))){
        //TODO might be slow and next one can not follow
        let transactApplicationSuccessful = cache.userOne.transact(payment.payment)
        CONSOLE_TIME("P A Y M E N T  I D: " + payment.paymentId);
        CONSOLE_TIME((cache.isClosingBundle(payment.payment, payment) ? "CLOSING" : "") + "APPLY_PAYMENT_MID:"+Date.now())
        if(!transactApplicationSuccessful){
          CONSOLE_LOG("transactPaymentError", 3)
          sendClosingBundle()
        } else {
          //update multi-sig address tree
          if(!cache.isClosingBundle(payment.payment, payment)){
            CONSOLE_LOG("transactPaymentSuccessful", 3)
            function updateDigestsTree() {
                //prepare digests object
                let partnersDigestsObjWithIndex = cache.cache.partnerDigests.map((userDigests, i) => {
                  const digestObj = {
                    userIndex: i, //TODO below bundlesTransacted
                    partialDigests: userDigests[payment.paymentId + 1].sort(function(a, b) { // + 1 because always the digests for the next round are added to the address tree
                     return parseInt(a.index) - parseInt(b.index);
                    })
                  }
                  return digestObj
                })
                CONSOLE_LOG("partnersDigestsObjWithIndex", 3)
                CONSOLE_LOG(partnersDigestsObjWithIndex, 3)
                cache.userOne.createAdditionalMultiSigs(partnersDigestsObjWithIndex) //TODO catch error i.e. more addresses created than allowed
              }
              //don't attempt processing of next bundle if digests are missing anyway
              updateDigestsTree()
          }
        }
        //attach closing bundle to tangle
        if(payment.paymentIsClosingBundle){
          CONSOLE_TIME("I_ATTACH_TO_TANGLE_START:"+Date.now())
          CONSOLE_LOG("ATTACHING TO TANGLE", 3)
          global.resetOngoing = true
          iota.POWClosedBundle(payment.payment, (e,r) => {
            CONSOLE_TIME("I_ATTACH_TO_TANGLE_END:"+Date.now())
            if(e !== null){
              CONSOLE_LOG("attaching Error, " + e, 3)
            } else {
              CONSOLE_LOG("attaching successful, " + r, 3)
            }
            CONSOLE_TIME("------------Channel Closed " + ((e !== null) ? "with error! (Always in Offline mode)" : "succesfully!"))
          })
        }
        cache.cache.bundlesTransactedCount++
        //unload payload of the bundle and keep the meta info
        cache.cache.storedBundles[i].payment = constants.EMPTY_STR
        cache.cache.storedBundles[i].paymentStatus = constants.TRANSACTED
        cache.cache.lastTransactedPaymentNumber = payment.paymentId
        cache.cache.bundleProcessingInProgress = -1
        CONSOLE_LOG(cache.cache.storedBundles, 3);
        CONSOLE_LOG(cache.userOne.returnDeposit(), 3)
        CONSOLE_LOG(cache.userOne.returnCurrentDeposit(), 3)
        CONSOLE_LOG("Bundle Transacted, " + (Date.now() - cache.cache.initTimestamp), 3)
        if(payment.paymentIsClosingBundle){
            CONSOLE_LOG("Resetting channel", 3)
            cache.resetChannel()
        }
      }
    }
    CONSOLE_TIME("APPLY_PAYMENT_END:"+Date.now())
    CONSOLE_TIME("------Applied Payment");
  }


module.exports = {
    sendDiscoveryInfo,
    sendClosingBundle,
    sendPayments,
    sendInit,
    getStageFlags
  }
