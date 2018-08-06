const constants = require("./constants.js")
var args = process.argv.slice(2);
const presets = require("./presets"+[args[0]])
const communicationLogic = require("./communicationLogic.js")
/********************************************/
/***********MAIN (VEHICLE CLIENT)***********/
/******************************************/

//platoon order
let initMapping = (args[1] == 2) ? ["2018010101", "2018010102"] : (args[1] == 3) ? ["2018010101", "2018010102", "2018010103"] : (args[1] == 4) ? ["2018010101", "2018010102", "2018010103", "2018010104"] : (args[1] == 5) ? ["2018010101", "2018010102", "2018010103", "2018010104", "2018010105"] : (args[1] == 6) ? ["2018010101", "2018010102", "2018010103", "2018010104", "2018010105", "2018010106"] : []

/**Discovery**/
setInterval(function() {
  if (!communicationLogic.getStageFlags().discoveryStage) {
    communicationLogic.sendDiscoveryInfo()
  }
}, 500) //TODO Hypertuning

/**Init**/
  setInterval(function() {
    if (!communicationLogic.getStageFlags().initOngoing && !communicationLogic.getStageFlags().initStage && communicationLogic.getStageFlags().discoveryStage) {
      communicationLogic.sendInit(initMapping)
    }
  }, 500)

/**Retrigger payment logic**/
  setInterval(function() {
    if (communicationLogic.getStageFlags().channelOpen) {
      communicationLogic.sendPayments()
    }
  }, 100)

/************************************************************************************************************************************************/
