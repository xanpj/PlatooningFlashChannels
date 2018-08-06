var args = process.argv.slice(2);
const presets = require("./presets"+[args[0]])
/***********CONFIG**********/
const configTemplate = {
  userSettlementAddress: presets.USER_SETTLEMENT_ADDRESS,
  deposits: presets.DEPOSITS,
  /*******FLASH CONFIG*******/
  flashConfig: {
    security: presets.FLASH_CONFIG.SECURITY,
    treeDepth: presets.FLASH_CONFIG.TREE_DEPTH,
    signersCount: presets.FLASH_CONFIG.SIGNERS_COUNT
  },
  /*****CHANNEL CONFIG****/
  channel: {
    purpose: presets.CHANNEL.PURPOSE,
    payment: {
      matrix:presets.CHANNEL.PAYMENT.MATRIX,
      frequency: presets.CHANNEL.PAYMENT.FREQUENCY
    },
    userIndex: 0, //will be changed during discovery
    vin: presets.CHANNEL.VIN,
    minUsers: presets.CHANNEL.MIN_USERS,
    depositOwn: presets.CHANNEL.DEPOSIT_OWN,
    depositMin: presets.CHANNEL.DEPOSIT_MIN,
    digestsPreTreeSize: presets.CHANNEL.DIGESTS_PRE_TREE_SIZE,
    sendDigestsWithBundle: presets.CHANNEL.SEND_DIGESTS_WITH_BUNDLE,
    penaltyMax: presets.PENALTY_MAX
  }
}

/*******STATE VAR TEMPLATES********/
const stageFlagsTemplate = {
  discoveryStage: false,
  initStage: false,
  digestsStage: false,
  bundleStage: false,
  secondBundleTransfered: false,
  channelOpen: false,
  checkStateChannelOpen: false,
  bundleBlock: false,
  initOngoing: false,
  digestsOngoing: false
}

const cacheTemplate = {
  packagesToReassemble: [],
  participants: [],
  userMatrixMapping: [],
  fromInput: [],
  digestsAmountForNextRounds: [],
  partnerDigests: [],
  settlementAddressesWithIndex: [],
  receivedChannelOpenings: [],
  userSignaturesWithIndex: [],
  proposals: [],
  proposalsIds: [],
  proposalIncreaseRequests: [],
  lastSendProposalId: -1,
  lastDerivedBundles: [],
  lastBundles: [], //bundles with an s because one can propose multiple bundles in one transfer
  storedBundles: [], //bundles with an s because one can propose multiple bundles in one transfer
  lastSignatures: [],
  receivedBundleIds: [],
  receivedSignatureBundleIds: [],
  initiatedBundles: [],
  bundlesTransactedCount: 0,
  bundleProcessingInProgress: -1,
  lastTransactedPaymentNumber: -1,
  initTimestamp: 0,
  resendActivities: 0,
  paymentRound: 0,
  paymentNumber: 0, //currentpaymentNumber as well as nextpaymentNumber dependent of point in time
  paymentNumberForDigests: 1, //slightly differs from paymentNumber because empty payments are not counted
  sendPackages: [],
  newPackage: false,
  finalPaymentForShow: false
}

const stateChannelCheckObjectTemplate = {
  penalty: 0,
  paymentNumberBeforeResend: -1,
}

module.exports = {
  configTemplate,
  stageFlagsTemplate,
  cacheTemplate,
  stateChannelCheckObjectTemplate
}
