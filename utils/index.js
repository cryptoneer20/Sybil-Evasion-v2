const {swapInJupiter} = require("./jupiter")
const {swapInPhoenix} = require("./phoenix")
const {swapInMayan} = require("./mayan_swap")
const {bridgeInMayan} = require('./mayan_bridge')
const {bridgeInDebridge} = require('./debridge')

const constants = require('./constants')

module.exports = {
    swapInJupiter,
    swapInPhoenix,
    swapInMayan,
    bridgeInMayan,
    bridgeInDebridge,
    ...constants
}