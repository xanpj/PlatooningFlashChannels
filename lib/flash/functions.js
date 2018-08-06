////////////////////////////////////////////////
//////////////  FLASH EXAMPLE  /////////////////
////////////////////////////////////////////////
// This provides access to basic functions /////
// required for the channels use.          /////
////////////////////////////////////////////////

const IOTACrypto = require("iota.crypto.js")
const transfer = require("./transfer")
const multisig = require("./multisig")

const createTransaction = (user, transferFrom, actions, close) => {
  try {
    //console.log("updateTree")
    //let toUse = updateTree(user);
    let toUse = multisig.updateLeafToRoot(user.flash.root);
    /////////////////////////////////
    /// CONSTRUCT BUNDLES
    let bundles
    let newTransfers

      // Check if its closing the channel
      let rootToUse = toUse.multisig;
      if (!close) {
        // Prepare the transfer.
        newTransfers = transfer.prepare(
          user.flash.settlementAddresses,
          user.flash.deposit,
          transferFrom,
          actions
        )
      } else {
        // Distribute the remaining channel balance amongst the channel users
        // NOTE: YOU MUST PASS THE SETTLEMENT ADDRESSES ARRAY as 'actions'
        newTransfers = transfer.close(actions, user.flash.deposit)
        rootToUse = user.flash.root;
      }

      // Compose the transfer bundles
      bundles = transfer.compose(
        user.flash.balance,
        user.flash.deposit,
        user.flash.outputs,
        rootToUse,
        //toUse.multisig,
        user.flash.remainderAddress,
        user.flash.transfers,
        newTransfers,
        close
      )
      return bundles
  } catch (e) {
    console.log("Error: ", e)
    return false
  }
}
const signTransaction = (user, bundles) => {
  return transfer.sign(user.flash.root, user.userSeed, bundles)
}
const applyTransfers = (user, bundles) => {
  newMultisigs = transfer.applyTransfers(
    user.flash.root,
    user.flash.deposit,
    user.flash.outputs,
    user.flash.remainderAddress,
    user.flash.transfers,
    bundles
  )
  user.flash.root = newMultisigs
  return user
}

const updateTree = (user) => {
    let toUse = multisig.updateLeafToRoot(user.flash.root);
    //isn't be called if tree is created beforehand
    if (toUse.generate !== 0) {
        let lastMultiSig = null;
        for( let i = 0; i < toUse.generate; i++) {
          console.log("Generate")

            // check if digests are still available from pool
            if( user.flash.multisigDigestPool.length === 0 ) {
                console.log('No multisignature digests left!')
                // ToDo: handle this case
            }


            let newMultiSig = user.flash.multisigDigestPool.shift();
            console.log(`Using new address from pool: ${JSON.stringify(newMultiSig)}`);

            // chain branch
            if (lastMultiSig != null)
                newMultiSig.children.push(lastMultiSig);
            lastMultiSig = newMultiSig;

            user.index++;
        }

        toUse.multisig.children.push(lastMultiSig);
    }
    return toUse;
}

const getDiff = (user, bundles) => {
  return transfer.getDiff(user.flash.root, user.flash.remainderAddress, user.flash.transfers, bundles)
}

module.exports = {
  createTransaction: createTransaction,
  signTransaction: signTransaction,
  applyTransfers: applyTransfers,
  updateTree: updateTree,
  getDiff: getDiff
}
