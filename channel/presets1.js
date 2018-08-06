var args = process.argv.slice(2);
module.exports = {
  //args = id, numParticipants, security, treeDepth, initDigests, sendDigestsWithBundles
  /*********IOTA CONFIG*******/
  SEED: "99ERTWOUSERTWOUSERTWOUSERTWOUSERTWOUSERTWOUSERTWOUSERTWOUSERTWOUSERTWOUSERTWOUSER",
  MCMC_DEPTH: 1, //MAIN_NET 4
  MIN_WEIGHT_MAGNITUDE: 14, //MAIN_NET 18
  /*******FLASH CONFIG*******/
  USER_SETTLEMENT_ADDRESS: "99ERTWO9ADDRESS9USERTWO9ADDRESS9USERTWO9ADDRESS9USERTWO9ADDRESS9USERTWO9ADDRESS9U",
  DEPOSITS: (args[1] == 2) ? [50, 50] : (args[1] == 3) ? [50, 50, 50] : (args[1] == 4) ? [80, 80, 80, 80] : (args[1] == 5) ? [80, 80, 80, 80, 80] : (args[1] == 6) ? [100, 100, 100, 100, 100, 100] : [],
  FLASH_CONFIG: {
    SECURITY: (args[2] !== undefined) ? parseInt(args[2]) : 2 ,
    TREE_DEPTH: (args[3] !== undefined) ? parseInt(args[3]) : 4 ,
    SIGNERS_COUNT: parseInt([args[1]])
  },
  /*****CHANNEL CONFIG****/
  CHANNEL: {
    PURPOSE: "platooning",
    PAYMENT: {
      MATRIX:
        (args[1] == 2) ?
        [[0, 0],
        [2, -2]]
        : (args[1] == 3) ?
        [[0, 0, 0],
        [1, -1, 0],
        [1, 1, -2]] : (args[1] == 4) ?
        [[0, 0, 0, 0],
        [1, -1, 0, 0],
        [1, 1, -2, 0],
        [1, 1, 1, -3]] : (args[1] == 5) ?
        [[0, 0, 0, 0, 0],
        [1, -1, 0, 0, 0],
        [1, 1, -2, 0, 0],
        [1, 1, 1, -3, 0],
        [1, 1, 1, 1, -4]] : (args[1] == 6) ?
        [[0, 0, 0, 0, 0, 0],
        [1, -1, 0, 0, 0, 0],
        [1, 1, -2, 0, 0, 0],
        [1, 1, 1, -3, 0, 0],
        [1, 1, 1, 1, -4, 0],
        [1, 1, 1, 1, 1, -5]] :
        [], // paymentMatrix. [[],[20,0,0],[]] p2 pays p1 20 in frequency interval
      FREQUENCY: 20000, //frequency in s //minimum time of package generation might be relevant
    },
    VIN: "2018010102",
    MIN_USERS: parseInt(args[1]),
    DEPOSIT_OWN: 0,
    DEPOSIT_MIN: 0,
    DIGESTS_PRE_TREE_SIZE:  (args[4] !== undefined) ? parseInt(args[4]) : 5 , //left branch of tree + remainder
    SEND_DIGESTS_WITH_BUNDLE: (args[5] !== undefined) ? Boolean(Number(args[5])) : false,
    //TODO deposit address
  },
  /******UDP CONFIG*****/
  ACCEPT_ALL_BUNDLES: false,
  MAX_WAIT_IOTA_COMMIT: 460000,
  PENALTY_MAX: 2,
  BROADCAST_PORT: 15000,
  BROADCAST_HOST: '192.168.178.255', //'172.20.10.15',//* '10.180.255.255', // 178
  PORT: 15001, // Server auf Port 15000
  HOST: '0.0.0.0', // Server auf allen verfügbaren IPs

  SEND_PORT: 15000, // ansprechender Server auf Port 15001
  SEND_HOST: '0.0.0.0', //Server auf allen verfügbaren IPs
  SEND_PORT_2: 15002, // ansprechender Server auf Port 15001
  SEND_HOST_2: '0.0.0.0', //Server auf allen verfügbaren IPs
  SEND_PORT_3: 15003, // ansprechender Server auf Port 15001
  SEND_HOST_3: '0.0.0.0', //Server auf allen verfügbaren IPs
  SEND_PORT_4: 15004, // ansprechender Server auf Port 15001
  SEND_HOST_4: '0.0.0.0', //Server auf allen verfügbaren IPs
  SEND_PORT_5: 15005, // ansprechender Server auf Port 15001
  SEND_HOST_5: '0.0.0.0', //Server auf allen verfügbaren IPs
  /*****IOTA SERVER CONFIG****/
  /*IOTA_HOST: 'http://p103.iotaledger.net',
  IOTA_PORT: '14700'*/
  IOTA_HOST: 'https://nodes.testnet.iota.org',
  IOTA_PORT: '443'
  /*IOTA_HOST: 'http://node01.testnet.iotatoken.nl',
  IOTA_PORT: '16265'*/
}
